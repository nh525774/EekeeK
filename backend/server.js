// server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const multer = require("multer");
const mime = require("mime-types");
const { s3, bucket: BUCKET } = require("./src/lib/s3");

const app = express();
const PORT = process.env.PORT || 5000;
app.set("trust proxy", 1);

// ─────────────────────────────────────────────
// 보안/로깅/파서
// ─────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
// app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// CORS
const allowOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!allowOrigins.length || allowOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 레이트리밋
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

// ─────────────────────────────────────────────
// DB (MONGO_URI)
// ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn("[WARN] .env에 MONGO_URI가 없습니다.");
} else {
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log("[DB] MongoDB connected"))
    .catch((err) => console.error("[DB] MongoDB connection error:", err.message));
}

// ─────────────────────────────────────────────
// 인증 미들웨어(있는 경우만 로드)
// ─────────────────────────────────────────────
let firebaseAuth = (req, _res, next) => next();
try {
  firebaseAuth = require("./middleware/firebaseAuth");
} catch {
  console.log("[Auth] firebaseAuth 미들웨어가 없어 패스스루로 동작합니다.");
}

// ─────────────────────────────────────────────
// API 라우트들
// ─────────────────────────────────────────────
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/posts/:postId/comments", require("./routes/commentRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api", require("./routes/protectRoutes"));
app.use("/api/places", require("./routes/placeRoutes"));
app.use("/api/me", require("./routes/myState"));
app.use("/api/pii", require("./routes/piiRoutes"));

// ★★★ 추가: eekrew 라우트 등록 (이게 없어서 404 났던 것)
app.use("/api/eekrew", require("./routes/eekrewRoutes"));

try {
  const userCtrl = require("./controllers/userController");
  app.get("/api/me", firebaseAuth, userCtrl.getMe);
  app.patch("/api/me", firebaseAuth, userCtrl.updateMe);
  app.post("/api/me", firebaseAuth, userCtrl.registerUser);
} catch {
  /* 컨트롤러 없으면 myState 라우트가 처리 */
}

// ─────────────────────────────────────────────
// S3에서 바로 읽어와 스트리밍(영상 Range 지원)
// ─────────────────────────────────────────────
function streamFromS3(res, key) {
  const stream = s3.getObject({ Bucket: BUCKET, Key: key }).createReadStream();

  stream.on("error", (err) => {
    console.error("[S3 stream error]", err.code, key);
    if (err.code === "NoSuchKey") res.status(404).send("Not Found");
    else if (err.code === "Forbidden") res.status(403).send("Forbidden");
    else res.status(500).send("S3 Error");
  });

  stream.pipe(res);
}

// /uploads/* → S3 후보 키 탐색 후 스트리밍
app.get(/^\/uploads\/(.+)$/, async (req, res) => {
  const p = decodeURIComponent(req.params[0]).replace(/^\/+/, "");
  const cands = [`uploads/${p}`, `${p}`, `eek-eek/uploads/${p}`];

  let responded = false;
  // headObject는 콜백 기반이라 간단히 시퀀셜 체크
  for (const key of cands) {
    if (responded) break;
    await new Promise((resolve) => {
      s3.headObject({ Bucket: BUCKET, Key: key }, (err, data) => {
        if (data && !responded) {
          res.set("Content-Type", data.ContentType || "application/octet-stream");
          streamFromS3(res, key);
          responded = true;
        }
        resolve();
      });
    });
  }
  if (!responded) res.status(404).send("Not Found");
});

app.get(/^\/static\/(.+)$/, (req, res) => {
  const p = decodeURIComponent(req.params[0]).replace(/^\/+/, "");
  const key = `static/${p}`;
  streamFromS3(res, key);
});

// ─────────────────────────────────────────────
// 업로드 샘플 (메모리→S3)
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});
const Post = require("./models/Post");

app.post("/upload", firebaseAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "파일 없음" });

    const ts = Date.now();
    const safe = (req.file.originalname || "file").replace(/[^\w.\-]+/g, "_");
    const key = `uploads/images/${ts}_${safe}`;

    await s3
      .upload({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "private",
      })
      .promise();

    const storedPath = `/uploads/images/${ts}_${safe}`;
    res.status(201).json({ url: storedPath });
  } catch (err) {
    console.error("[upload error]", err);
    res.status(500).json({ message: "S3 업로드 실패", error: err.message });
  }
});

// 체크
app.get("/health", (_req, res) => res.status(200).json({ ok: true, ts: new Date().toISOString() }));
app.get("/", (_req, res) => res.send("Backend is running!"));

// 에러 핸들러
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`[Server] listening on port ${PORT}`);
  if (allowOrigins.length) console.log("[CORS] allowed:", allowOrigins.join(", "));
});
