// middleware/loginRisk.js
const crypto = require("crypto");
const User = require("../models/User");
const UserLoginProfile = require("../models/UserLoginProfile");
const Geo = require("../services/GeoService");      // ipLookup(ip) -> { country, region, city, ll:[lat,lng] } | null
const Risk = require("../services/riskService");    // assess({ userId, ipLoc, deviceHash }) -> { score, reasons }

/**
 * 프록시/로컬 고려한 클라이언트 IP 추출
 */
function getClientIp(req) {
  const xf = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const xr = req.headers["x-real-ip"];
  let ip = xf || xr || req.ip || "";

  // IPv4-mapped IPv6 표기 정규화 (::ffff:1.2.3.4)
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);

  // (선택) 개발 모드에서 테스트 IP 주입 허용
  if (process.env.NODE_ENV === "development") {
    const devIp = req.headers["x-dev-ip"] || process.env.DEV_TEST_IP;
    if (devIp) ip = String(devIp);
  }
  return ip;
}

module.exports = async function loginRisk(req, res, next) {
  try {
    // 0) userId 확보 (req.user 없으면 firebaseUid로 조회)
    let userId = req.user?._id;
    if (!userId && req.firebaseUid) {
      const me = await User.findOne({ firebaseUid: req.firebaseUid }).select("_id");
      if (me) {
        userId = me._id;
        req.user = me; // 이후 라우트에서 사용할 수 있게 세팅
      }
    }
    if (!userId) return next(); // 비로그인 요청이면 스킵

    // 1) 좌표 우선
    const hasGps =
      req.body &&
      Number.isFinite(+req.body.lat) &&
      Number.isFinite(+req.body.lng);
    const gpsLL = hasGps ? [Number(req.body.lat), Number(req.body.lng)] : null;

    // 2) GeoIP (좌표 없을 때만)
    const ip = getClientIp(req);
    const ipLoc = hasGps ? null : Geo.ipLookup(ip); // { ll:[lat,lng], country, ... } | null

    // 3) 디바이스 지문 (간단 버전)
    const ua = req.headers["user-agent"] || "";
    const lang = req.headers["accept-language"] || "";
    const deviceHash = crypto
      .createHash("sha256")
      .update(`${ua}|${lang}`)
      .digest("hex");

    // 4) 위험도 평가 입력 (좌표 있으면 그걸 ipLoc 대체로 전달)
    const effectiveLoc = hasGps
      ? { ll: gpsLL, country: null, region: null, city: null }
      : ipLoc;

    const { score, reasons } = await Risk.assess({
      userId,
      ipLoc: effectiveLoc, // 내부에서 ll 사용
      deviceHash,
      source: hasGps ? 'gps' : 'geoip',
    });

    // 5) 결과를 요청 컨텍스트에 부착
    req.loginRisk = {
      score,
      reasons,
      ipLoc: effectiveLoc || null,
      source: hasGps ? "gps" : "geoip",
      deviceHash,
      ip,
    };

    // 6) 원자적 업데이트(버전 충돌 회피)
    const now = new Date();

    // 공통 업데이트: riskHistory(앞삽입/슬라이스), lastIP, 최초 생성 시 locationConsent=true
    const update = {
      $setOnInsert: { userId, locationConsent: true },
      $set: { lastIP: ip },
      $push: {
        riskHistory: {
          $each: [{ score, reasons, at: now }],
          $position: 0,
          $slice: 50,
        },
      },
    };

    // 안전/경고 구간(<50)에서만 최근 위치/신뢰 디바이스 갱신
    if (score < 50) {
      // 위치가 있을 때만 lastLocations push
      const ll = hasGps ? gpsLL : (effectiveLoc && effectiveLoc.ll);
      if (ll && ll.length === 2) {
        const [lat, lng] = ll;
        update.$push.lastLocations = {
          $each: [
            { geo: { type: "Point", coordinates: [lng, lat] }, at: now },
          ],
          $position: 0,
          $slice: 10,
        };
      }
      // trustedDevices는 중복 없이 추가
      update.$addToSet = { trustedDevices: deviceHash };
    }

    // upsert + 단일 원자 연산 → VersionError 방지
    await UserLoginProfile.findOneAndUpdate(
      { userId },
      update,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return next();
  } catch (err) {
    console.error("loginRisk error", err);
    // 리스크 평가 실패해도 본요청은 막지 않음
    return next();
  }
};

