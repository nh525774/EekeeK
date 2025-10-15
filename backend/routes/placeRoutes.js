const router = require('express').Router();
const Place = require('../models/Place');
const User = require('../models/User'); 
const auth = require('../middleware/firebaseAuth');

router.post('/', auth, async (req, res) => {
  try {
    const { name='내 장소', desc='', lat, lng, address='', visibility='private', tags=[] } = req.body;

    // ★ userId 확보: req.user 또는 firebaseUid로 보강
    let userId = req.user?._id;
    if (!userId && req.firebaseUid) {
      const me = await User.findOne({ firebaseUid: req.firebaseUid }).select('_id');
      if (!me) return res.status(404).json({ message: '내 계정을 찾을 수 없습니다.' });
      userId = me._id;
    }
    if (!userId) return res.status(401).json({ message: '인증 필요' });

    const place = await Place.create({
      userId,                                              // ★ 반드시 채워짐
      name, desc, address, visibility, tags,
      geo: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
    });

    res.json(place);
  } catch (e) {
    console.error('POST /api/places error', e);
    res.status(500).json({ message: '장소 저장 실패' });
  }
});

router.get('/near', auth, async (req, res) => {
  try {
    const { lat, lng, km=1 } = req.query;
    const meters = Number(km) * 1000;
    const docs = await Place.find({
      geo: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: meters
        }
      }
    }).limit(50);
    res.json(docs);
  } catch (e) {
    console.error('GET /api/places/near error', e);
    res.status(500).json({ message: '근처 검색 실패' });
  }
});

module.exports = router;