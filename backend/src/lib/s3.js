// backend/src/lib/s3.js
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const bucket = process.env.S3_BUCKET;

// 파일 업로드 (서버 -> S3)
function putObject({ Key, Body, ContentType }) {
  return s3
    .upload({
      Bucket: bucket,
      Key,
      Body,
      ContentType,
      ACL: "private", // 퍼블릭 X
    })
    .promise();
}

// 파일 다운로드 (서버 -> 클라이언트로 스트리밍)
function getObject(Key) {
  return s3.getObject({ Bucket: bucket, Key }).promise();
}

module.exports = {
  s3,
  bucket,
  putObject,
  getObject,
};