const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('Email already exists');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const determineRole = role || 'student';

    const user = new User({
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      role: determineRole
    });
    await user.save();

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.header('Authorization', 'Bearer ' + token).send({ token, user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role } });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid valid Email or Password');

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).send('Invalid valid Email or Password');

    if (user.role !== role) return res.status(400).send('Incorrect role selected');

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.header('Authorization', 'Bearer ' + token).send({ token, user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role } });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/me', require('../middleware/auth').auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.send(user);
    } catch(err) {
        res.status(500).send("Error fetching user");
    }
})

module.exports = router;
