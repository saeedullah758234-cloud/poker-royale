const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get All Active Tables
router.get('/tables', async (req, res) => {
    try {
        const [tables] = await db.query('SELECT * FROM game_tables WHERE is_active = 1');
        res.json({ success: true, tables });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error loading game tables' });
    }
});

// Get Table Details
router.get('/tables/:id', async (req, res) => {
    try {
        const [tables] = await db.query('SELECT * FROM game_tables WHERE id = ?', [req.params.id]);
        if (tables.length === 0) return res.status(404).json({ success: false, message: 'Table not found' });

        res.json({ success: true, table: tables[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error loading table details' });
    }
});

module.exports = router;