// routes/myState.js
const router = require('express').Router();
const auth = require('../middleware/firebaseAuth');
const loginRisk = require('../middleware/loginRisk');
const UserLoginProfile = require('../models/UserLoginProfile'); // ✅ 추가

router.get('/', auth, loginRisk, async (req, res) => {
  try {
    // loginRisk가 req.user, req.loginRisk( deviceHash 포함 )를 세팅함
    const userId = req.user?._id;
    let isNewDevice = false;
    let trustedCount = 0;

    if (userId) {
      const prof = await UserLoginProfile.findOne({ userId }).lean();
      if (prof) {
        const td = Array.isArray(prof.trustedDevices) ? prof.trustedDevices : [];
        trustedCount = td.length;
        // 현재 디바이스가 trustedDevices에 없으면 '새 디바이스'
        isNewDevice = !(td.includes(req.loginRisk?.deviceHash));
      }
    }

    res.json({
      ok: true,
      risk: req.loginRisk || null,
      isNewDevice,
      trustedCount,
      lastIP: req.loginRisk?.ip || null,
      source: req.loginRisk?.source || null, // 'gps' | 'geoip'
    });
  } catch (e) {
    console.error('GET /api/me error', e);
    res.json({ ok: true, risk: req.loginRisk || null, isNewDevice: false });
  }
});

// POST도 동일하게
router.post('/', auth, loginRisk, async (req, res) => {
  try {
    const userId = req.user?._id;
    let isNewDevice = false;
    let trustedCount = 0;

    if (userId) {
      const prof = await UserLoginProfile.findOne({ userId }).lean();
      if (prof) {
        const td = Array.isArray(prof.trustedDevices) ? prof.trustedDevices : [];
        trustedCount = td.length;
        isNewDevice = !(td.includes(req.loginRisk?.deviceHash));
      }
    }

    res.json({
      ok: true,
      risk: req.loginRisk || null,
      isNewDevice,
      trustedCount,
      lastIP: req.loginRisk?.ip || null,
      source: req.loginRisk?.source || null,
    });
  } catch (e) {
    console.error('POST /api/me error', e);
    res.json({ ok: true, risk: req.loginRisk || null, isNewDevice: false });
  }
});

module.exports = router;
