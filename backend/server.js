const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors') //cors 모듈 불러오기- 모든 프론트엔드 도메인의 요청을 받겠따는 읨. 개발환영에서는 이렇게 열어놓고, 운영 환경에서는 모데인 지정해서 제한해야한대..

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); //cors미들웨어 적용
app.use(express.json()); //추가해도 좋음, post 요청에서 req.body-나중에 post요청에서 body를 제대로 받는데 도움됨

app.get("/", (req, res) => {
  res.send("Backend is running! 🚀");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.post("/register", (req, res) => {
    res.send("User registered!");
  });