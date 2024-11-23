const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const connection = require('./server/db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ใช้ CORS
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'], // อนุญาต URL ของ Frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// รองรับ Preflight Requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  next();
});

app.use(bodyParser.json());

// Routes
app.use('/chat', chatRoutes);
app.use('/auth', authRoutes);

// เชื่อมต่อฐานข้อมูล
connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// Error Handling
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Internal server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
