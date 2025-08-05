const admin = require("../firebase");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "토큰 없음" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
     req.user = {
      uid: decoded.uid,
      name: decoded.name || "익명",  // Firebase에 이름 없을 수도 있으니 기본값
      photoURL: decoded.picture || "", // 기본값 공백
    };

    next(); // 인증 통과
  } catch (err) {
    console.error(" Firebase 토큰 검증 실패:", err);
    res.status(401).json({ message: "유효하지 않은 Firebase 토큰" });
  }
};
