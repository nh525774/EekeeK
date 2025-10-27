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
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // 비디오 크로스오리진 허용
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://kr.object.ncloudstorage.com", "https://kr.object.ncloudstorage.com/eek-eek",],
        "media-src": ["'self'", "blob:", "https://kr.object.ncloudstorage.com", "https://kr.object.ncloudstorage.com/eek-eek",],
        "connect-src": ["'self'", "https:", "ws:"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'", "https://cdn.jsdelivr.net"],
        "script-src": ["'self'"],
      },
    },
  })
);
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

app.use(
  "/uploads",
  express.static("/app/uploads", {
    fallthrough: true,
    etag: false,
    maxAge: "1m",
    setHeaders: (res, filePath) => {
      // mp4는 확실히 video/mp4로 지정
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        // iOS Safari에서 MIME sniff 막는 nosniff 제거
        res.removeHeader?.("X-Content-Type-Options");
      }
      // Range 요청 허용 (비디오 시킹용)
      res.setHeader("Accept-Ranges", "bytes");
      // 캐시도 짧게
      res.setHeader("Cache-Control", "public, max-age=60");
    },
  })
);

// API 라우트들
// ─────────────────────────────────────────────
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/posts/:postId/comments", require("./routes/commentRoutes"));
app.use("/api/me", require("./routes/myState")); // ✅ 위험도/디바이스 상태 전용
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api", require("./routes/protectRoutes"));
app.use("/api/places", require("./routes/placeRoutes"));
app.use("/api/pii", require("./routes/piiRoutes"));
app.use("/api/eekrew", require("./routes/eekrewRoutes")); // 이크루 라우트

//  userController 직접 연결은 /api/users/* 로만 (중복 방지)
try {
  const userCtrl = require("./controllers/userController");
  app.get("/api/users/me", firebaseAuth, userCtrl.getMe);
  app.patch("/api/users/me", firebaseAuth, userCtrl.updateMe);
  app.post("/api/users/register", firebaseAuth, userCtrl.registerUser);
} catch (e) {
  console.warn("userController not found, skipping direct bindings");
}

// ─────────────────────────────────────────────
// S3에서 바로 읽어와 스트리밍(영상 Range 지원)
// ─────────────────────────────────────────────
function streamFromS3(res, key) {
  const stream = s3.getObject({ Bucket: BUCKET, Key: key }).createReadStream();

    // 클라이언트가 연결 끊으면 스트림 정리
  res.once("close", () => {
    try { stream.destroy(); } catch {}
  });

  // 스트림 에러 처리: 이미 헤더/바디 전송 시작했다면 추가 전송 금지
  stream.once("error", (err) => {
    console.error("[S3 stream error]", err.code, key);
    try { stream.destroy(); } catch {}
    if (!res.headersSent) {
      const code = err.code === "NoSuchKey" ? 404
                : err.code === "Forbidden" ? 403
                : 500;
      // 한 번만 응답
      return res.status(code).send(code === 500 ? "S3 Error" : "Not Found");
    }
    // 이미 전송 중이면 연결만 닫기(추가 헤더/바디 금지)
    try { res.end(); } catch {}
  });

  stream.pipe(res);
}

// /uploads/* → S3 후보 키 탐색 후 스트리밍
app.get(/^\/uploads\/(.+)$/, async (req, res) => {
  const p = decodeURIComponent(req.params[0]).replace(/^\/+/, "");
  const cands = [`uploads/${p}`, `${p}`, `eek-eek/uploads/${p}`];

  let responded = false;
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
// 업로드 (메모리→S3)  ← 프론트와 맞추기 위해 /api/upload 로 변경
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});
// const Post = require("./models/Post"); // 사용 안 하면 주석 유지 OK

app.post("/api/upload", firebaseAuth, upload.single("image"), async (req, res) => {
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
