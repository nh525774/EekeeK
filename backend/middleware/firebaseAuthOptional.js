const admin = require("../firebase");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    // 토큰이 없어도 그냥 next() → 비로그인 사용자는 req.firebaseUid가 없음
    return next();
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
    req.user = {
      uid: decoded.uid,
      name: decoded.name || "익명",
      photoURL: decoded.picture || "",
    };
  } catch (err) {
    console.error("Optional Firebase 토큰 검증 실패:", err);
    // 토큰이 잘못돼도 그냥 비로그인 취급
    req.firebaseUid = null;
  }
  next();
};
