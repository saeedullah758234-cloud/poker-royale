const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files from project root
const rootDir = path.join(__dirname, '../');
app.use(express.static(rootDir));

// API Endpoints
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

// Fallback Route for Home
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'login.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PokerRoyale Server active at http://127.0.0.1:${PORT}`);
});