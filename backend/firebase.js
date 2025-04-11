const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey-abc123.json"); // 여기에 실제 파일 이름!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
