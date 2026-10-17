/**
 * ═══════════════════════════════════════════════════════
 *  PokerRoyale — Backend Server (Express + MySQL)
 *  File: server/server.js
 *  Port: 3000
 * ═══════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 1. CORE MIDDLEWARE (Must be at the top) ───
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: '*', // Allows localhost frontend requests
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 2. DATABASE CONNECTION ───
const db = require('./config/db');

async function testDB() {
    try {
        const conn = await db.getConnection();
        console.log('✅ MySQL Database Connected — poker_royale_db');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
        console.error('   Ensure XAMPP MySQL is running and database exists.');
    }
}
testDB();

// ─── 3. ROUTE IMPORTS ───
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const gamesRoutes = require('./routes/games');
const adminRoutes = require('./routes/admin'); // ← ADMIN ROUTE IMPORT

// ─── 4. REGISTER API ROUTES (BEFORE CATCH-ALL & 404) ───
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/admin', adminRoutes);             // ← ADMIN ROUTE MOUNTED HERE

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'PokerRoyale API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ─── 5. FRONTEND CATCH-ALL (Must be AFTER all API routes) ───
app.get('*', (req, res) => {
    // If request starts with /api/, return 404 JSON instead of index.html
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: `API Route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ─── 6. GLOBAL ERROR HANDLER (Must be at the very bottom) ───
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ─── START SERVER ───
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🃏 PokerRoyale Complete Platform Server');
    console.log('═══════════════════════════════════════════');
    console.log(`  🚀 Server:  http://localhost:${PORT}`);
    console.log(`  🔐 Auth:    http://localhost:${PORT}/api/auth`);
    console.log(`  👤 Users:   http://localhost:${PORT}/api/users`);
    console.log(`  🎮 Games:   http://localhost:${PORT}/api/games`);
    console.log(`  👑 Admin:   http://localhost:${PORT}/api/admin`);
    console.log('═══════════════════════════════════════════');
    console.log('');
});

module.exports = app;