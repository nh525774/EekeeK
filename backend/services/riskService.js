// riskService.js
const UserLoginProfile = require('../models/UserLoginProfile');

function distKm([alat, alng], [blat, blng]) {
  const R=6371, d2r=x=>x*Math.PI/180;
  const dlat=d2r(blat-alat), dlng=d2r(blng-alng);
  const a=Math.sin(dlat/2)**2+Math.cos(d2r(alat))*Math.cos(d2r(blat))*Math.sin(dlng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

module.exports = {
  // 🔧 source 추가(기본 geoip) — loginRisk에서 넘겨주는 값 사용
  async assess({ userId, ipLoc, deviceHash, now = new Date(), source = 'geoip' }) {
    const prof = await UserLoginProfile.findOne({ userId });
    let score = 0, reasons = [];

    // 출처에 따라 임계치/규칙 조정
    const isGPS = (source === 'gps');          // HTTPS에서만 가능
    const CITY_THRESHOLD_KM   = isGPS ? 200  : 800;     // 도시/좌표 변경 임계치
    const RAPID_THRESHOLD_KM  = isGPS ? 1000 : Infinity; // 급격이동(24h 내) — geoip이면 끔
    const COUNTRY_STRICT_DKM  = isGPS ? 1    : 1500;    // 국가 변경도 geoip면 아주 크게 차이날 때만

    if (prof) {
      // 1) 국가 변경 (geoip일 땐 보수적으로)
      if (ipLoc?.country && prof.homeRegion?.country && ipLoc.country !== prof.homeRegion.country) {
        // 거리가 충분히 멀 때만 카운트 (geoip 노이즈 방지)
        const last = prof.lastLocations?.[0];
        const lastLL = last?.geo?.coordinates ? [last.geo.coordinates[1], last.geo.coordinates[0]] : null;
        const nowLL  = ipLoc?.ll || null;
        let farEnough = true;
        if (lastLL && nowLL) {
          const dkm = distKm(lastLL, nowLL);
          farEnough = dkm > COUNTRY_STRICT_DKM;
        }
        if (farEnough) { score += 40; reasons.push('COUNTRY_CHANGE'); }
      }

      // 2) 도시/좌표 크게 변경
      const last = prof.lastLocations?.[0];
      const lastLL = last?.geo?.coordinates ? [last.geo.coordinates[1], last.geo.coordinates[0]] : null; // [lat,lng]
      const nowLL  = ipLoc?.ll || null;
      if (lastLL && nowLL) {
        const dkm = distKm(lastLL, nowLL);
        if (dkm > CITY_THRESHOLD_KM) { score += 25; reasons.push('CITY_FAR_CHANGE'); }

        // 3) 급격 이동 (24h 내 X km↑) — geoip면 비활성화
        const hours = last?.at ? (now - new Date(last.at)) / 36e5 : null;
        if (isGPS && hours != null && hours <= 24 && dkm > RAPID_THRESHOLD_KM) {
          score += 25; reasons.push('RAPID_MOVE_24H_1000KM');
        }
      }

      // 4) 새 디바이스
      if (!prof.trustedDevices?.includes(deviceHash)) {
        score += 20; reasons.push('NEW_DEVICE');
      }
    }

    return { score, reasons, prof };
  }
};

