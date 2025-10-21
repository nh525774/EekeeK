
//  // backend/middleware/authMiddleware.js
// import admin from "firebase-admin";

// /**
//  * Firebase Admin 초기화 (중복 방지)
//  * - 우선순위: ENV에 직렬화된 서비스계정(JSON) → GOOGLE_APPLICATION_CREDENTIALS → 기타 런타임 기본자격
//  */
// if (!admin.apps.length) {
//   const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT; // 문자열(JSON) 형태 기대
//   if (svcJson) {
//     try {
//       const creds = JSON.parse(svcJson);
//       admin.initializeApp({ credential: admin.credential.cert(creds) });
//       // console.log("[auth] initialized with FIREBASE_SERVICE_ACCOUNT");
//     } catch (e) {
//       console.error("[auth] Invalid FIREBASE_SERVICE_ACCOUNT JSON:", e);
//       admin.initializeApp({ credential: admin.credential.applicationDefault() });
//     }
//   } else {
//     admin.initializeApp({ credential: admin.credential.applicationDefault() });
//     // console.log("[auth] initialized with applicationDefault()");
//   }
// }

// /** 공통: Authorization 헤더에서 Bearer 토큰 추출 */
// const getBearerToken = (req) => {
//   const h = req.headers.authorization || req.headers.Authorization || "";
//   return typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7) : null;
// };

// /**
//  * 필수 인증 미들웨어
//  * - 토큰 없거나/검증 실패 시 401
//  * - 성공 시 req.user에 최소 정보 세팅
//  */
// export const requireAuth = async (req, res, next) => {
//   try {
//     const token = getBearerToken(req);
//     if (!token) return res.status(401).json({ message: "No token" });

//     const decoded = await admin.auth().verifyIdToken(token);
//     // 필요한 필드 추가 가능 (email, name, picture 등)
//     req.user = {
//       uid: decoded.uid,
//       email: decoded.email || null,
//       name: decoded.name || null,
//       picture: decoded.picture || null,
//     };
//     return next();
//   } catch (err) {
//     console.error("[requireAuth] verifyIdToken error:", err?.message || err);
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };

// /**
//  * 선택형 인증 미들웨어 (비로그인 허용)
//  * - 토큰 없거나/검증 실패해도 next()
//  * - 성공 시 req.user 세팅
//  */
// export const optionalAuth = async (req, _res, next) => {
//   try {
//     const token = getBearerToken(req);
//     if (!token) return next();

//     const decoded = await admin.auth().verifyIdToken(token);
//     req.user = {
//       uid: decoded.uid,
//       email: decoded.email || null,
//       name: decoded.name || null,
//       picture: decoded.picture || null,
//     };
//   } catch (err) {
//     // 토큰이 잘못돼도 비로그인 취급으로 통과
//     console.warn("[optionalAuth] token invalid, continuing as guest");
//   }
//   return next();
// };

// export default { requireAuth, optionalAuth };
