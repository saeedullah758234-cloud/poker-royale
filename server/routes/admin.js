const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretpokerkey123');
        if (!decoded.is_admin) return res.status(403).json({ error: 'Super Admin privileges required.' });
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const [userCount] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const [balanceSum] = await db.query('SELECT SUM(balance) as totalBalance FROM wallets');
        const [tableCount] = await db.query('SELECT COUNT(*) as activeTables FROM tables');
        
        res.json({
            totalUsers: userCount[0].totalUsers || 0,
            totalBalance: parseFloat(balanceSum[0].totalBalance || 0).toFixed(2),
            activeTables: tableCount[0].activeTables || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch platform statistics.' });
    }
});

router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, w.balance, u.is_admin 
            FROM users u 
            JOIN wallets w ON u.id = w.user_id 
            ORDER BY u.id DESC`);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

router.put('/users/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { balance, is_admin } = req.body;
    try {
        await db.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [balance, id]);
        await db.query('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin ? 1 : 0, id]);
        res.json({ message: 'User updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed.' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM site_settings');
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed settings load.' });
    }
});

router.put('/settings', verifyAdmin, async (req, res) => {
    const settings = req.body;
    try {
        for (const key in settings) {
            await db.query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, String(settings[key]), String(settings[key])]
            );
        }
        res.json({ message: 'Settings saved successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings.' });
    }
});

router.get('/tables', verifyAdmin, async (req, res) => {
    try {
        const [tables] = await db.query('SELECT * FROM tables ORDER BY id DESC');
        res.json(tables);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load tables.' });
    }
});

router.post('/tables', verifyAdmin, async (req, res) => {
    const { name, game_type, small_blind, big_blind, min_buy_in, max_buy_in } = req.body;
    try {
        await db.query(
            'INSERT INTO tables (name, game_type, small_blind, big_blind, min_buy_in, max_buy_in) VALUES (?, ?, ?, ?, ?, ?)',
            [name, game_type || 'texas', small_blind, big_blind, min_buy_in, max_buy_in]
        );
        res.json({ message: 'New table created!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create table.' });
    }
});

router.delete('/tables/:id', verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM tables WHERE id = ?', [req.params.id]);
        res.json({ message: 'Table deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Delete table failed.' });
    }
});

module.exports = router;