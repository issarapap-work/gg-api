const express = require('express');
const bcrypt = require('bcryptjs');
const connection = require('../server/db');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ใช้ Environment Variable สำหรับ JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Route สำหรับสมัครสมาชิก
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking username' });
    }
    if (results.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: 'Error hashing password' });
      }

      const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
      connection.query(query, [username, hashedPassword], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error registering user' });
        }
        res.status(200).json({ message: 'User registered successfully' });
      });
    });
  });
});

// Route สำหรับเข้าสู่ระบบ
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user credentials' });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, results[0].password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // สร้าง JWT Token
      const token = jwt.sign({ id: results[0].id, username }, JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ message: 'Login successful', token });
    });
  });
});

// Route สำหรับตรวจสอบการล็อกอิน
router.get('/isLoggedIn', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ loggedIn: false });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ loggedIn: false });
    }
    res.status(200).json({ loggedIn: true, username: user.username });
  });
});

module.exports = router;
