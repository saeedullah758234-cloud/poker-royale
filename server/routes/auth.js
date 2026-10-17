const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    let { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    try {
        // 1. Check if user already exists
        const [exists] = await db.query(
            'SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?', 
            [cleanEmail, cleanUsername]
        );
        
        if (exists.length > 0) {
            return res.status(400).json({ error: 'Username or Email is already taken.' });
        }

        // 2. Hash Password with Bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert User
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 0)',
            [cleanUsername, cleanEmail, hashedPassword]
        );

        const userId = result.insertId;

        // 4. Insert Default Wallet
        await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [userId, 1000.00]);

        console.log(`✅ [REGISTER SUCCESS] User: ${cleanUsername} (ID: ${userId})`);
        return res.status(201).json({ message: 'Registration successful! You can now log in.' });

    } catch (err) {
        console.error('❌ [REGISTER ERROR]:', err);
        return res.status(500).json({ error: 'Server error during registration. Please try again.' });
    }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    let { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
    }

    const cleanLogin = login.trim().toLowerCase();

    try {
        // Fetch User and Wallet balance
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.password_hash, u.is_admin, COALESCE(w.balance, 0) as balance 
            FROM users u 
            LEFT JOIN wallets w ON u.id = w.user_id 
            WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?`, 
            [cleanLogin, cleanLogin]
        );

        if (users.length === 0) {
            console.log(`⚠️ [LOGIN FAIL] User not found: "${cleanLogin}"`);
            return res.status(400).json({ error: 'Invalid credentials. User does not exist.' });
        }

        const user = users[0];

        // Compare Bcrypt Password Hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            console.log(`⚠️ [LOGIN FAIL] Password mismatch for user: "${user.username}"`);
            return res.status(400).json({ error: 'Invalid credentials. Incorrect password.' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, username: user.username, is_admin: user.is_admin },
            process.env.JWT_SECRET || 'supersecretpokerkey123',
            { expiresIn: '24h' }
        );

        console.log(`✅ [LOGIN SUCCESS] User: "${user.username}" (Admin: ${user.is_admin})`);

        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: parseFloat(user.balance),
                is_admin: Boolean(user.is_admin)
            }
        });

    } catch (err) {
        console.error('❌ [LOGIN ERROR]:', err);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;