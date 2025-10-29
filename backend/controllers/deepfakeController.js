const path = require("path");
const { v4: uuid } = require("uuid");
const { s3, bucket, putObject, getObject } = require("../src/lib/s3");
const { postJson } = require("../src/lib/aiClient");
const AI_APPLY_ENDPOINT = "/deepfake/apply";

async function presignGet(Key, expiresSec = 300) {
  return await s3.getSignedUrlPromise("getObject", {
    Bucket: bucket,
    Key,
    Expires: expiresSec,
  });
}

function buildKeys(originalName = "") {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/"); // 2025/10/29 -> 2025/10/29
  const id = uuid();
  const ext = (path.extname(originalName) || ".jpg").toLowerCase();
  return {
    origKey: `uploads/originals/${today}/${id}${ext}`,
    procKey: `uploads/processed/${today}/${id}_df${ext}`,
  };
}

/** POST /api/deepfake/image  (서버 경유 업로드 + 즉시 필터) */
exports.handleImageUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file이 필요합니다." });

    // 1) 원본 S3(비공개) 업로드
    const { origKey, procKey } = buildKeys(req.file.originalname);
    await putObject({
      Key: origKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || "image/jpeg",
    });

    // 2) AI가 읽을 수 있도록 원본에 대한 사전서명 URL 생성
    const sourceUrl = await presignGet(origKey, 300);

    // 3) AI 서버에 동기 적용 요청 (bytes 반환 모드 권장)
    //    - FastAPI 측에서 {"mode":"bytes"}일 때 {mime, dataBase64} 반환하도록 구현해두면 깔끔
    //    - 만약 {outputUrl}을 주는 구현이라면 그 URL 그대로 반환하면 됨.
    const aiResp = await postJson(AI_APPLY_ENDPOINT, {
        sourceUrl,
        mode: "bytes",
    });

    let imageUrl; // 최종 클라이언트가 볼 URL
    if (aiResp?.outputUrl) {
      // (대안) AI가 이미 외부 접근 가능한 URL을 주는 경우
      imageUrl = aiResp.outputUrl;
    } else if (aiResp?.dataBase64 && aiResp?.mime) {
      // 4) 처리본을 우리 S3(비공개)에 저장
      const buffer = Buffer.from(aiResp.dataBase64, "base64");
      await putObject({
        Key: procKey,
        Body: buffer,
        ContentType: aiResp.mime,
      });
      // 5) 프론트에는 서명 URL(짧은 만료) 혹은 API 프록시 경로를 제공
      //    여기서는 API 프록시 경로로 제공 (항상 접근 가능)
      imageUrl = `/api/deepfake/image/${encodeURIComponent(procKey)}`;
    } else {
      return res.status(502).json({ error: "AI 응답 형식을 이해할 수 없습니다.", detail: aiResp });
    }

    // 필요 시 DB 저장 로직 추가 가능
    return res.json({
      imageUrl,                                     // 프론트에서 쓰는 최종 경로
      originalUrl: `/api/deepfake/image/${encodeURIComponent(origKey)}`, // 원본 확인용(선택)
    });
  } catch (e) {
    console.error("[deepfake/image] ", e?.response?.data || e.message);
    return res.status(500).json({ error: "이미지 처리 실패", detail: e?.response?.data || e.message });
  }
};

/** GET /api/deepfake/image/:key  (S3 private 객체 프록시) */
exports.streamImage = async (req, res) => {
  try {
    const Key = req.params.key;
    if (!Key) return res.status(400).send("key required");

    const { Body, ContentType, ContentLength, ETag, LastModified } = await getObject(Key);
    if (ContentType) res.setHeader("Content-Type", ContentType);
    if (ContentLength) res.setHeader("Content-Length", ContentLength);
    if (ETag) res.setHeader("ETag", ETag);
    if (LastModified) res.setHeader("Last-Modified", new Date(LastModified).toUTCString());
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 필요시 조정

    return res.send(Body);
  } catch (e) {
    console.error("[deepfake/stream] ", e.message);
    return res.status(404).send("Not Found");
  }
};