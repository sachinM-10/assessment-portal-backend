const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Standard header token
  let token = req.header('Authorization')?.replace('Bearer ', '');

  // Fallback: sendBeacon sends text/plain body — parse and extract _token
  if (!token && req.body) {
    let bodyObj = req.body;
    if (typeof bodyObj === 'string') {
      try { bodyObj = JSON.parse(bodyObj); } catch { bodyObj = {}; }
    }
    token = bodyObj._token;
  }

  if (!token) return res.status(401).send('Access Denied: No Token Provided!');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access Denied: You do not have admin permissions.');
  }
  next();
};

const student = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).send('Access Denied: You do not have student permissions.');
  }
  next();
};

module.exports = { auth, admin, student };
