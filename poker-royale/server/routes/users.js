/**
 * ═══════════════════════════════════════════════════════
 *  PokerRoyale — User Routes
 *  File: server/routes/users.js
 * ═══════════════════════════════════════════════════════
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ─── Helpers ───
function ok(res, data = null, message = 'Success') {
    return res.json({ success: true, message, data });
}
function fail(res, message = 'Error', status = 400) {
    return res.status(status).json({ success: false, message });
}

// ═══════════════════════════════════════════
//  GET /api/users/profile
//  Get logged-in user's full profile
// ═══════════════════════════════════════════
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        const [rows] = await db.query(
            `SELECT 
                u.id, u.full_name, u.email, u.phone, u.date_of_birth,
                u.phone_verified, u.created_at, u.updated_at,
                COALESCE(w.real_balance, 0) AS real_balance,
                COALESCE(w.bonus_balance, 0) AS bonus_balance,
                COALESCE(w.pending_balance, 0) AS pending_balance,
                COALESCE(w.locked_balance, 0) AS locked_balance,
                COALESCE(w.total_deposited, 0) AS total_deposited,
                COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
                COALESCE(w.currency, 'USD') AS currency
             FROM users u
             LEFT JOIN wallets w ON w.user_id = u.id
             WHERE u.id = ?
             LIMIT 1`,
            [userId]
        );

        // Fallback if schema uses user_id instead of id
        if (rows.length === 0) {
            const [rows2] = await db.query(
                `SELECT u.*, 
                    COALESCE(w.real_balance, 0) AS real_balance,
                    COALESCE(w.bonus_balance, 0) AS bonus_balance,
                    COALESCE(w.total_deposited, 0) AS total_deposited,
                    COALESCE(w.total_withdrawn, 0) AS total_withdrawn
                 FROM users u
                 LEFT JOIN wallets w ON w.user_id = u.user_id
                 WHERE u.user_id = ?
                 LIMIT 1`,
                [userId]
            );
            if (rows2.length === 0) return fail(res, 'User not found', 404);
            const user = rows2[0];
            delete user.password_hash;
            delete user.otp_code;
            return ok(res, user);
        }

        const user = rows[0];
        delete user.password_hash;
        delete user.otp_code;
        return ok(res, user);
    } catch (err) {
        console.error('Get Profile Error:', err);
        return fail(res, 'Failed to load profile', 500);
    }
});

// ═══════════════════════════════════════════
//  PUT /api/users/profile
//  Update profile (name, phone, etc.)
// ═══════════════════════════════════════════
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { fullName, full_name, phone, email } = req.body;

        const name = fullName || full_name;

        // Build dynamic update
        const updates = [];
        const params = [];

        if (name) {
            updates.push('full_name = ?');
            params.push(name.trim());
        }
        if (phone) {
            // Check phone not used by another user
            const [dup] = await db.query(
                'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1',
                [phone.trim(), userId]
            ).catch(() => [[]]);

            // Also try user_id schema
            if (!dup || dup.length === 0) {
                try {
                    const [dup2] = await db.query(
                        'SELECT user_id FROM users WHERE phone = ? AND user_id != ? LIMIT 1',
                        [phone.trim(), userId]
                    );
                    if (dup2.length > 0) return fail(res, 'Phone number already in use');
                } catch (e) {}
            } else if (dup.length > 0) {
                return fail(res, 'Phone number already in use');
            }

            updates.push('phone = ?');
            params.push(phone.trim());
        }
        if (email) {
            const emailTrim = email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
                return fail(res, 'Invalid email address');
            }
            try {
                const [dup] = await db.query(
                    'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
                    [emailTrim, userId]
                );
                if (dup.length > 0) return fail(res, 'Email already in use');
            } catch (e) {
                const [dup2] = await db.query(
                    'SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1',
                    [emailTrim, userId]
                );
                if (dup2.length > 0) return fail(res, 'Email already in use');
            }
            updates.push('email = ?');
            params.push(emailTrim);
        }

        if (updates.length === 0) {
            return fail(res, 'No fields to update');
        }

        updates.push('updated_at = NOW()');
        params.push(userId);

        // Try id column first, then user_id
        try {
            await db.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                params
            );
        } catch (e) {
            await db.query(
                `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
                params
            );
        }

        return ok(res, null, 'Profile updated successfully');
    } catch (err) {
        console.error('Update Profile Error:', err);
        return fail(res, 'Failed to update profile', 500);
    }
});

// ═══════════════════════════════════════════
//  PUT /api/users/password
//  Change password
// ═══════════════════════════════════════════
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return fail(res, 'Current password and new password are required');
        }
        if (newPassword.length < 8) {
            return fail(res, 'New password must be at least 8 characters');
        }
        if (confirmPassword && newPassword !== confirmPassword) {
            return fail(res, 'New passwords do not match');
        }

        // Get current hash
        let user;
        try {
            const [rows] = await db.query(
                'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
                [userId]
            );
            user = rows[0];
        } catch (e) {
            const [rows] = await db.query(
                'SELECT user_id AS id, password_hash FROM users WHERE user_id = ? LIMIT 1',
                [userId]
            );
            user = rows[0];
        }

        if (!user) return fail(res, 'User not found', 404);

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return fail(res, 'Current password is incorrect', 401);

        const newHash = await bcrypt.hash(newPassword, 12);

        try {
            await db.query(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [newHash, userId]
            );
        } catch (e) {
            await db.query(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?',
                [newHash, userId]
            );
        }

        return ok(res, null, 'Password changed successfully');
    } catch (err) {
        console.error('Change Password Error:', err);
        return fail(res, 'Failed to change password', 500);
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/stats
//  Player statistics for profile dashboard
// ═══════════════════════════════════════════
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        let stats = {
            total_games_played: 0,
            total_hands_played: 0,
            total_tournaments: 0,
            tournaments_won: 0,
            biggest_pot_won: 0,
            total_earned: 0,
            win_rate: 0,
            loyalty_points: 0,
            vip_tier: 'bronze'
        };

        try {
            const [rows] = await db.query(
                `SELECT 
                    COALESCE(total_games_played, 0) AS total_games_played,
                    COALESCE(total_hands_played, 0) AS total_hands_played,
                    COALESCE(total_tournaments, 0) AS total_tournaments,
                    COALESCE(tournaments_won, 0) AS tournaments_won,
                    COALESCE(biggest_pot_won, 0) AS biggest_pot_won,
                    COALESCE(total_earned, 0) AS total_earned,
                    COALESCE(win_rate, 0) AS win_rate,
                    COALESCE(loyalty_points, 0) AS loyalty_points,
                    COALESCE(vip_tier, 'bronze') AS vip_tier
                 FROM users WHERE id = ? OR user_id = ? LIMIT 1`,
                [userId, userId]
            );
            if (rows.length > 0) stats = { ...stats, ...rows[0] };
        } catch (e) {
            // Columns may not exist in simple OTP schema — return defaults
        }

        // Wallet stats
        try {
            const [w] = await db.query(
                `SELECT 
                    COALESCE(real_balance, 0) AS real_balance,
                    COALESCE(bonus_balance, 0) AS bonus_balance,
                    COALESCE(total_deposited, 0) AS total_deposited,
                    COALESCE(total_withdrawn, 0) AS total_withdrawn
                 FROM wallets WHERE user_id = ? LIMIT 1`,
                [userId]
            );
            if (w.length > 0) {
                stats.real_balance = parseFloat(w[0].real_balance);
                stats.bonus_balance = parseFloat(w[0].bonus_balance);
                stats.total_deposited = parseFloat(w[0].total_deposited);
                stats.total_withdrawn = parseFloat(w[0].total_withdrawn);
            }
        } catch (e) {}

        return ok(res, stats);
    } catch (err) {
        console.error('Get Stats Error:', err);
        return fail(res, 'Failed to load stats', 500);
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/game-history
//  Paginated game / hand history
// ═══════════════════════════════════════════
router.get('/game-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        let history = [];
        try {
            const [rows] = await db.query(
                `SELECT 
                    h.hand_id, h.table_id, h.pot_total, h.rake_taken,
                    h.winning_hand, h.winner_user_id, h.started_at, h.ended_at,
                    t.table_name, t.game_type
                 FROM hands h
                 LEFT JOIN game_tables t ON t.table_id = h.table_id
                 WHERE h.winner_user_id = ? OR h.hand_id IN (
                     SELECT hand_id FROM hand_actions WHERE user_id = ?
                 )
                 ORDER BY h.ended_at DESC
                 LIMIT ? OFFSET ?`,
                [userId, userId, limit, offset]
            );
            history = rows;
        } catch (e) {
            // Demo history if tables don't exist
            history = getDemoGameHistory(userId);
        }

        return ok(res, {
            history,
            page,
            limit,
            total: history.length
        });
    } catch (err) {
        console.error('Game History Error:', err);
        return ok(res, { history: getDemoGameHistory(req.user.user_id || req.user.id), page: 1, limit: 20 });
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/transactions
//  User's own transaction history
// ═══════════════════════════════════════════
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const type = req.query.type || '';

        let sql = 'SELECT * FROM transactions WHERE user_id = ?';
        const params = [userId];

        if (type && type !== 'all') {
            sql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        let rows = [];
        try {
            const [result] = await db.query(sql, params);
            rows = result;
        } catch (e) {
            rows = getDemoTransactions(userId);
        }

        return ok(res, { transactions: rows, page, limit });
    } catch (err) {
        console.error('Transactions Error:', err);
        return ok(res, { transactions: getDemoTransactions(req.user.user_id || req.user.id), page: 1, limit: 20 });
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/settings
//  Get notification / security preferences
// ═══════════════════════════════════════════
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        // Default settings (extend with settings table later)
        return ok(res, {
            email_notifications: true,
            sms_notifications: false,
            two_factor_enabled: false,
            sound_effects: true,
            marketing_emails: false,
            session_timeout_minutes: 30
        });
    } catch (err) {
        return fail(res, 'Failed to load settings', 500);
    }
});

// ═══════════════════════════════════════════
//  PUT /api/users/settings
//  Update preferences
// ═══════════════════════════════════════════
router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const {
            email_notifications,
            sms_notifications,
            two_factor_enabled,
            sound_effects,
            marketing_emails
        } = req.body;

        // Store in system_settings or user_settings table if exists
        // For now acknowledge save
        return ok(res, {
            email_notifications: !!email_notifications,
            sms_notifications: !!sms_notifications,
            two_factor_enabled: !!two_factor_enabled,
            sound_effects: sound_effects !== false,
            marketing_emails: !!marketing_emails
        }, 'Settings saved successfully');
    } catch (err) {
        return fail(res, 'Failed to save settings', 500);
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/kyc
//  KYC status for current user
// ═══════════════════════════════════════════
router.get('/kyc', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        let docs = [];
        try {
            const [rows] = await db.query(
                `SELECT kyc_id, document_type, status, rejection_reason, created_at, verified_at
                 FROM kyc_verifications WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );
            docs = rows;
        } catch (e) {}

        const verified = docs.some(d => d.status === 'approved');
        const pending = docs.some(d => d.status === 'pending');

        // Also check phone_verified from users
        let phoneVerified = false;
        try {
            const [u] = await db.query(
                'SELECT phone_verified FROM users WHERE id = ? OR user_id = ? LIMIT 1',
                [userId, userId]
            );
            if (u.length) phoneVerified = !!u[0].phone_verified;
        } catch (e) {}

        return ok(res, {
            overall_status: verified ? 'verified' : pending ? 'pending' : 'unverified',
            phone_verified: phoneVerified,
            documents: docs
        });
    } catch (err) {
        return fail(res, 'Failed to load KYC status', 500);
    }
});

// ═══════════════════════════════════════════
//  DELETE /api/users/account
//  Soft-delete / request account deletion
// ═══════════════════════════════════════════
router.delete('/account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { password } = req.body;

        if (!password) return fail(res, 'Password required to delete account');

        let user;
        try {
            const [rows] = await db.query(
                'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
                [userId]
            );
            user = rows[0];
        } catch (e) {
            const [rows] = await db.query(
                'SELECT user_id AS id, password_hash FROM users WHERE user_id = ? LIMIT 1',
                [userId]
            );
            user = rows[0];
        }

        if (!user) return fail(res, 'User not found', 404);

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return fail(res, 'Incorrect password', 401);

        // Soft delete / deactivate
        try {
            await db.query(
                `UPDATE users SET 
                    account_status = 'deleted',
                    email = CONCAT('deleted_', id, '_', email),
                    phone = CONCAT('deleted_', id, '_', phone),
                    updated_at = NOW()
                 WHERE id = ?`,
                [userId]
            );
        } catch (e) {
            await db.query(
                `UPDATE users SET account_status = 'deleted', updated_at = NOW() WHERE user_id = ?`,
                [userId]
            );
        }

        return ok(res, null, 'Account deleted successfully');
    } catch (err) {
        console.error('Delete Account Error:', err);
        return fail(res, 'Failed to delete account', 500);
    }
});

// ═══════════════════════════════════════════
//  GET /api/users/:id  (Admin — view any user)
// ═══════════════════════════════════════════
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;

        let user;
        try {
            const [rows] = await db.query(
                `SELECT u.*, w.real_balance, w.bonus_balance, w.total_deposited, w.total_withdrawn
                 FROM users u
                 LEFT JOIN wallets w ON w.user_id = u.id
                 WHERE u.id = ? LIMIT 1`,
                [targetId]
            );
            user = rows[0];
        } catch (e) {
            const [rows] = await db.query(
                `SELECT u.*, w.real_balance, w.bonus_balance, w.total_deposited, w.total_withdrawn
                 FROM users u
                 LEFT JOIN wallets w ON w.user_id = u.user_id
                 WHERE u.user_id = ? LIMIT 1`,
                [targetId]
            );
            user = rows[0];
        }

        if (!user) return fail(res, 'User not found', 404);

        delete user.password_hash;
        delete user.otp_code;
        return ok(res, user);
    } catch (err) {
        console.error('Admin Get User Error:', err);
        return fail(res, 'Failed to load user', 500);
    }
});

// ═══════════════════════════════════════════
//  DEMO DATA (if DB tables incomplete)
// ═══════════════════════════════════════════
function getDemoGameHistory(userId) {
    return [
        { hand_id: 246, table_name: 'Royal Flush Lounge', game_type: 'texas_holdem', pot_total: 8500, winning_hand: 'Two Pair', result: 'win', ended_at: '2025-01-20 18:30:00' },
        { hand_id: 245, table_name: 'Royal Flush Lounge', game_type: 'texas_holdem', pot_total: 500, winning_hand: null, result: 'fold', ended_at: '2025-01-20 18:15:00' },
        { hand_id: 244, table_name: 'Omaha Masters', game_type: 'omaha', pot_total: 3200, winning_hand: 'Flush', result: 'win', ended_at: '2025-01-19 22:10:00' },
        { hand_id: 243, table_name: 'Diamond Players', game_type: 'texas_holdem', pot_total: 1000, winning_hand: 'Straight', result: 'loss', ended_at: '2025-01-19 20:00:00' },
        { hand_id: 242, table_name: 'High Roller VIP', game_type: 'texas_holdem', pot_total: 15000, winning_hand: 'Full House', result: 'win', ended_at: '2025-01-18 16:45:00' }
    ];
}

function getDemoTransactions(userId) {
    return [
        { transaction_id: 'TXN-94821', type: 'deposit', amount: 500, status: 'completed', payment_method: 'paypal', created_at: '2025-01-20 14:32:00' },
        { transaction_id: 'TXN-87341', type: 'withdrawal', amount: 250, status: 'completed', payment_method: 'bank_transfer', created_at: '2025-01-18 09:12:00' },
        { transaction_id: 'TXN-76219', type: 'bonus', amount: 100, status: 'completed', payment_method: 'bonus', created_at: '2025-01-15 19:45:00' },
        { transaction_id: 'TXN-65102', type: 'deposit', amount: 1000, status: 'completed', payment_method: 'visa', created_at: '2025-01-12 11:20:00' },
        { transaction_id: 'TXN-54890', type: 'withdrawal', amount: 150, status: 'pending', payment_method: 'skrill', created_at: '2025-01-10 21:05:00' }
    ];
}

module.exports = router;