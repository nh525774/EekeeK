const UserLoginProfile = require('../models/UserLoginProfile');

function distKm([alat, alng], [blat, blng]) {
  const R=6371, d2r=x=>x*Math.PI/180;
  const dlat=d2r(blat-alat), dlng=d2r(blng-alng);
  const a=Math.sin(dlat/2)**2+Math.cos(d2r(alat))*Math.cos(d2r(blat))*Math.sin(dlng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

module.exports = {
  async assess({ userId, ipLoc, deviceHash, now = new Date() }) {
    const prof = await UserLoginProfile.findOne({ userId });
    let score = 0, reasons = [];

    if (prof) {
      // 1) 국가 변경
      if (ipLoc?.country && ipLoc.country !== prof.homeRegion?.country) {
        score += 40; reasons.push('COUNTRY_CHANGE');
      }

      // 2) 도시/좌표 크게 변경 (>200km, GeoIP 좌표)
      const last = prof.lastLocations?.[0];
      const lastLL = last?.geo?.coordinates ? [last.geo.coordinates[1], last.geo.coordinates[0]] : null; // [lat,lng]
      const nowLL  = ipLoc?.ll || null;
      if (lastLL && nowLL) {
        const dkm = distKm(lastLL, nowLL);
        if (dkm > 200) { score += 25; reasons.push('CITY_FAR_CHANGE'); }

        // 3) 급격이동 (24h 내 1000km↑)
        const hours = last?.at ? (now - new Date(last.at)) / 36e5 : null;
        if (hours != null && hours <= 24 && dkm > 1000) {
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
