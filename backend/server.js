const express = require("express");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
const cors = require('cors') 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB 연결 성공!'))
  .catch(err => console.error('MongoDB 연결 실패:', err));


app.use(cors()); //cors미들웨어 적용
app.use(express.json());


app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running! ");
});

app.post("/api/auth/test", (req, res) => {
  console.log("테스트 라우트 도달!");
  res.send("테스트 성공!");
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

