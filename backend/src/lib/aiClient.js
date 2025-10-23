const axios = require("axios");
const FormData = require("form-data");

const AI_URL = process.env.AI_URL || "http://127.0.0.1:7000";
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || "90000", 10);

function buildForm(fields = {}, files = []) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    form.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  for (const f of files) {
    if (f.buffer) form.append(f.fieldName, f.buffer, { filename: f.filename, contentType: f.contentType });
    else if (f.stream) form.append(f.fieldName, f.stream, { filename: f.filename, contentType: f.contentType });
  }
  return form;
}

async function postForm(endpoint, fields, files) {
  const form = buildForm(fields, files);
  const { data } = await axios.post(`${AI_URL}${endpoint}`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: AI_TIMEOUT_MS,
    validateStatus: (s) => s < 500,
  });
  return data;
}

async function postJson(endpoint, json) {
  const { data } = await axios.post(`${AI_URL}${endpoint}`, json, {
    timeout: AI_TIMEOUT_MS,
    validateStatus: (s) => s < 500,
  });
  return data;
}

module.exports = { postForm, postJson };
