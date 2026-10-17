const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretpokerkey123');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// GET User Profile & Balance
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.username, u.email, u.is_admin, u.avatar, w.balance 
            FROM users u 
            JOIN wallets w ON u.id = w.user_id 
            WHERE u.id = ?`, 
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;