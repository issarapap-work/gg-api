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
    return res.status(401).json({ loggedIn: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ loggedIn: false, message: 'Invalid or expired token' });
    }
    res.status(200).json({ loggedIn: true, username: user.username });
  });
});

module.exports = router;
router.post('/createRoom', (req, res) => {
  const { roomName, createdBy } = req.body;

  console.log('Received:', { roomName, createdBy }); // Debug Log

  if (!roomName || !createdBy) {
    return res.status(400).json({ error: 'Room name and createdBy are required' });
  }

  const query = 'INSERT INTO chat_rooms (name, created_by) VALUES (?, ?)';
  connection.query(query, [roomName, createdBy], (err, results) => {
    if (err) {
      console.error('Error creating chat room:', err);
      return res.status(500).json({ error: 'Error creating chat room' });
    }
    res.status(201).json({ message: 'Room created', roomId: results.insertId });
  });
});

router.get('/getChatRooms', (req, res) => {
  const query = 'SELECT * FROM chat_rooms';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching chat rooms:', err);
      return res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }

    console.log('Fetched chat rooms:', results);
    res.status(200).json(results);
  });
});

router.post('/send', (req, res) => {
  const { chat_room_id, sender, recipient, content, timestamp } = req.body;

  if (!chat_room_id || !sender || !recipient || !content || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ตรวจสอบว่า chat_room_id มีอยู่ในตาราง chat_rooms
  const checkRoomQuery = 'SELECT * FROM chat_rooms WHERE id = ?';
  connection.query(checkRoomQuery, [chat_room_id], (err, results) => {
    if (err || results.length === 0) {
      console.error('Chat room not found or error:', err);
      return res.status(400).json({ error: 'Invalid chat room ID' });
    }

    // บันทึกข้อความในตาราง messages
    const insertMessageQuery =
      'INSERT INTO messages (chat_room_id, sender, recipient, content, timestamp) VALUES (?, ?, ?, ?, ?)';
    connection.query(
      insertMessageQuery,
      [chat_room_id, sender, recipient, content, timestamp],
      (err, results) => {
        if (err) {
          console.error('Error saving message:', err);
          return res.status(500).json({ error: 'Error saving message' });
        }
        res.status(201).json({ message: 'Message sent successfully' });
      }
    );
  });
});

router.get('/get/:username', (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const query = 'SELECT * FROM messages WHERE sender = ? OR recipient = ? ORDER BY timestamp';
  connection.query(query, [username, username], (err, results) => {
    if (err) {
      console.error('Error fetching messages:', err);
      return res.status(500).json({ error: 'Error fetching messages' });
    }

    console.log('Fetched messages for user:', username, results);
    res.status(200).json(results);
  });
});
router.get('/getRoomId/:username', (req, res) => {
  const { username } = req.params;

  // ดึง ID ของห้องแชทจากชื่อผู้ใช้งาน
  const query = 'SELECT id AS chat_room_id FROM chat_rooms WHERE name = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      console.error('Chat room not found for username:', username);
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // ส่ง chat_room_id กลับไปยัง Frontend
    res.status(200).json({ chat_room_id: results[0].chat_room_id });
  });
});
router.delete('/deleteRoom/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const query = 'DELETE FROM chat_rooms WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting chat room:', err);
      return res.status(500).json({ error: 'Failed to delete chat room' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    res.status(200).json({ message: 'Chat room deleted successfully' });
  });
});


