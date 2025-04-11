/*
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    console.log('register 함수 진입');
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        console.log('이미 존재하는 사용자 : ', username);
        return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    const savedUser = await newUser.save();
    console.log('저장된 사용자:', savedUser);

    res.status(201).json({ message: '회원가입 성공' });
  } catch (err) {
    console.error('회원가입 중 오류:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: '사용자를 찾을 수 없습니다.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: '서버 에러' });
  }
};
*/
