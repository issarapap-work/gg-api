// db.js
const mysql = require('mysql2');

// เชื่อมต่อกับฐานข้อมูล MySQL
const connection = mysql.createConnection({
  host: 'localhost',       // ชื่อโฮสต์หรือที่อยู่ของฐานข้อมูล MySQL
  user: 'root',            // ชื่อผู้ใช้ฐานข้อมูล
  password: '',            // รหัสผ่านของฐานข้อมูล
  database: 'user_management',  // ชื่อฐานข้อมูลที่คุณสร้างไว้
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Connected as id ' + connection.threadId);
});

module.exports = connection;
