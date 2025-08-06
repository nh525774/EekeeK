import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // user.id 포함
    next();
  } catch (error) {
    res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
};
