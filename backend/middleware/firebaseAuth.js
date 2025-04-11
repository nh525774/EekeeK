const admin = require("../firebase");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "토큰 없음" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
    next(); // 인증 통과
  } catch (err) {
    console.error(" Firebase 토큰 검증 실패:", err);
    res.status(401).json({ message: "유효하지 않은 Firebase 토큰" });
  }
};
