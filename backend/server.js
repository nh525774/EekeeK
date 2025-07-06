const mime = require('mime');
mime.define({ 'video/mp4': ['mp4'] }, true);
const express = require("express");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
const cors = require('cors') 

const multer = require('multer');
const Post = require('./models/Post');
const firebaseAuth = require('./middleware/firebaseAuth');
const searchRoutes = require('./routes/searchRoutes');
const notificationsRouter = require("./routes/notificationRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

const protectRoutes = require('./routes/protectRoutes');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB 연결 성공!'))
  .catch(err => console.error('MongoDB 연결 실패:', err));


app.use(cors()); //cors미들웨어 적용
app.use(express.json());

app.use('/uploads', express.static('uploads'));
app.use("/static", express.static(__dirname + "/static"));

app.use('/api/search', searchRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use("/api/notifications", notificationsRouter);
app.use('/api', protectRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running! ");
});

app.post("/api/auth/test", (req, res) => {
  console.log("테스트 라우트 도달!");
  res.send("테스트 성공!");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => 
    cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

//이미지 업로드 + 게시글 생성

app.post('/upload',firebaseAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message : '파일을 첨부하세요.'});
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const { caption } = req.body;

    const newPost = await Post.create({
      userId: req.firebaseUid,
      title:    caption,      //caption을 title로
      content:  imageUrl      // 이미지 URL을 content 필드에 저장
    });
    
    res.status(201).json(newPost);
  } catch (err) {
    console.error('업로드, 저장 실패 : ', err);
    res.status(500).json({ message: '업로드 중 오류 발생' });
  }
}
);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
