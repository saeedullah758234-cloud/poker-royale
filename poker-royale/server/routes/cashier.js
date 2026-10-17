// ============================================================
//  server/routes/cashier.js
//  Poker Royale – Cashier / Financial Routes
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// ──────────────────────────────────────────────
//  HELPER: generate unique transaction ID
// ──────────────────────────────────────────────
function generateTxnId(prefix = 'TXN') {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// ──────────────────────────────────────────────
//  HELPER: validate positive amount
// ──────────────────────────────────────────────
function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && Number.isFinite(num);
}

// ============================================================
//  1. GET /api/cashier/balance
//     → Return the authenticated user's full balance breakdown
// ============================================================
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
         real_balance,
         bonus_balance,
         locked_balance,
         currency,
         last_deposit_at,
         last_withdrawal_at
       FROM user_balances
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Auto-create balance row if it doesn't exist yet
      await db.query(
        `INSERT INTO user_balances
           (user_id, real_balance, bonus_balance, locked_balance, currency)
         VALUES (?, 0.00, 0.00, 0.00, 'USD')`,
        [userId]
      );

      return res.json({
        success: true,
        data: {
          real_balance: 0,
          bonus_balance: 0,
          locked_balance: 0,
          total_balance: 0,
          currency: 'USD',
          last_deposit_at: null,
          last_withdrawal_at: null
        }
      });
    }

    const bal = rows[0];
    const total = parseFloat(bal.real_balance)
                + parseFloat(bal.bonus_balance)
                + parseFloat(bal.locked_balance);

    res.json({
      success: true,
      data: {
        real_balance: parseFloat(bal.real_balance),
        bonus_balance: parseFloat(bal.bonus_balance),
        locked_balance: parseFloat(bal.locked_balance),
        total_balance: parseFloat(total.toFixed(2)),
        currency: bal.currency,
        last_deposit_at: bal.last_deposit_at,
        last_withdrawal_at: bal.last_withdrawal_at
      }
    });
  } catch (err) {
    console.error('[CASHIER] balance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  2. POST /api/cashier/deposit
//     → Create a deposit request
//     Body: { amount, payment_method, currency?, bonus_code? }
// ============================================================
router.post('/deposit', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { amount, payment_method, currency, bonus_code } = req.body;

    // ── Validation ──
    if (!isValidAmount(amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid deposit amount'
      });
    }

    const depositAmount = parseFloat(parseFloat(amount).toFixed(2));

    // Min / Max limits
    const MIN_DEPOSIT = 10;
    const MAX_DEPOSIT = 50000;
    if (depositAmount < MIN_DEPOSIT || depositAmount > MAX_DEPOSIT) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Deposit must be between $${MIN_DEPOSIT} and $${MAX_DEPOSIT}`
      });
    }

    const allowedMethods = [
      'credit_card', 'debit_card', 'bank_transfer',
      'crypto_btc', 'crypto_eth', 'crypto_usdt',
      'skrill', 'neteller', 'eco_payz', 'paypal'
    ];
    if (!allowedMethods.includes(payment_method)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method'
      });
    }

    // ── Daily deposit limit check ──
    const [dailyRows] = await connection.query(
      `SELECT COALESCE(SUM(amount), 0) AS daily_total
       FROM transactions
       WHERE user_id = ?
         AND type = 'deposit'
         AND status = 'completed'
         AND created_at >= CURDATE()`,
      [userId]
    );
    const DAILY_LIMIT = 100000;
    if (parseFloat(dailyRows[0].daily_total) + depositAmount > DAILY_LIMIT) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Daily deposit limit exceeded'
      });
    }

    // ── Bonus calculation ──
    let bonusAmount = 0;
    let bonusId = null;
    if (bonus_code) {
      const [promoRows] = await connection.query(
        `SELECT id, bonus_percentage, max_bonus, min_deposit, active
         FROM promotions
         WHERE code = ? AND type = 'deposit_bonus' AND active = 1
           AND (start_date IS NULL OR start_date <= NOW())
           AND (end_date IS NULL OR end_date >= NOW())`,
        [bonus_code]
      );
      if (promoRows.length > 0) {
        const promo = promoRows[0];
        if (depositAmount >= parseFloat(promo.min_deposit)) {
          bonusAmount = Math.min(
            depositAmount * (promo.bonus_percentage / 100),
            parseFloat(promo.max_bonus)
          );
          bonusAmount = parseFloat(bonusAmount.toFixed(2));
          bonusId = promo.id;

          // Mark promo as used
          await connection.query(
            `INSERT INTO user_promotions (user_id, promotion_id, status, claimed_at)
             VALUES (?, ?, 'active', NOW())
             ON DUPLICATE KEY UPDATE status = 'active', claimed_at = NOW()`,
            [userId, bonusId]
          );
        }
      }
    }

    // ── Create transaction record ──
    const txnId = generateTxnId('DEP');
    const [result] = await connection.query(
      `INSERT INTO transactions
         (txn_id, user_id, type, amount, bonus_amount, payment_method,
          currency, status, bonus_code, created_at)
       VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'pending', ?, NOW())`,
      [txnId, userId, depositAmount, bonusAmount,
       payment_method, currency || 'USD', bonus_code || null]
    );
    const transactionId = result.insertId;

    // ── For demo / instant methods, auto-complete ──
    const instantMethods = ['credit_card', 'debit_card', 'crypto_usdt'];
    if (instantMethods.includes(payment_method)) {
      await connection.query(
        `UPDATE transactions SET status = 'completed', completed_at = NOW()
         WHERE id = ?`,
        [transactionId]
      );

      // Credit user balance
      await connection.query(
        `UPDATE user_balances
         SET real_balance  = real_balance + ?,
             bonus_balance = bonus_balance + ?,
             last_deposit_at = NOW()
         WHERE user_id = ?`,
        [depositAmount, bonusAmount, userId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Deposit request created',
      data: {
        transaction_id: transactionId,
        txn_id: txnId,
        amount: depositAmount,
        bonus_amount: bonusAmount,
        payment_method,
        status: instantMethods.includes(payment_method) ? 'completed' : 'pending'
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('[CASHIER] deposit error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================================
//  3. POST /api/cashier/withdraw
//     → Create a withdrawal request
//     Body: { amount, payment_method, account_details }
// ============================================================
router.post('/withdraw', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { amount, payment_method, account_details } = req.body;

    // ── Validation ──
    if (!isValidAmount(amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal amount'
      });
    }

    const withdrawAmount = parseFloat(parseFloat(amount).toFixed(2));

    const MIN_WITHDRAW = 20;
    const MAX_WITHDRAW = 25000;
    if (withdrawAmount < MIN_WITHDRAW || withdrawAmount > MAX_WITHDRAW) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Withdrawal must be between $${MIN_WITHDRAW} and $${MAX_WITHDRAW}`
      });
    }

    if (!account_details || typeof account_details !== 'string') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account details are required'
      });
    }

    // ── KYC check ──
    const [kycRows] = await connection.query(
      `SELECT kyc_status FROM users WHERE id = ?`,
      [userId]
    );
    if (kycRows.length === 0 || kycRows[0].kyc_status !== 'approved') {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'KYC verification required before withdrawal'
      });
    }

    // ── Balance check (real balance only) ──
    const [balRows] = await connection.query(
      `SELECT real_balance FROM user_balances WHERE user_id = ? FOR UPDATE`,
      [userId]
    );
    if (balRows.length === 0 || parseFloat(balRows[0].real_balance) < withdrawAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient real balance for withdrawal'
      });
    }

    // ── Wagering requirement check ──
    const [wagerRows] = await connection.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_deposits
       FROM transactions
       WHERE user_id = ? AND type = 'deposit' AND status = 'completed'`,
      [userId]
    );
    const [wageredRows] = await connection.query(
      `SELECT COALESCE(SUM(rake_amount), 0) AS total_wagered
       FROM game_history
       WHERE user_id = ?`,
      [userId]
    );
    const totalDeposits = parseFloat(wagerRows[0].total_deposits);
    const totalWagered  = parseFloat(wageredRows[0].total_wagered);
    const WAGERING_MULTIPLIER = 1; // 1× rollover
    if (totalWagered < totalDeposits * WAGERING_MULTIPLIER) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Wagering requirement not met',
        data: {
          required: totalDeposits * WAGERING_MULTIPLIER,
          wagered: totalWagered,
          remaining: (totalDeposits * WAGERING_MULTIPLIER) - totalWagered
        }
      });
    }

    // ── Pending withdrawal limit ──
    const [pendingRows] = await connection.query(
      `SELECT COUNT(*) AS cnt FROM transactions
       WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending'`,
      [userId]
    );
    if (pendingRows[0].cnt >= 3) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 pending withdrawals allowed'
      });
    }

    // ── Deduct from real balance & lock ──
    await connection.query(
      `UPDATE user_balances
       SET real_balance   = real_balance - ?,
           locked_balance = locked_balance + ?
       WHERE user_id = ?`,
      [withdrawAmount, withdrawAmount, userId]
    );

    // ── Create transaction ──
    const txnId = generateTxnId('WDR');
    const [result] = await connection.query(
      `INSERT INTO transactions
         (txn_id, user_id, type, amount, payment_method, currency,
          status, account_details, created_at)
       VALUES (?, ?, 'withdrawal', ?, ?, 'USD', 'pending', ?, NOW())`,
      [txnId, userId, withdrawAmount, payment_method, account_details]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted – awaiting admin approval',
      data: {
        transaction_id: result.insertId,
        txn_id: txnId,
        amount: withdrawAmount,
        status: 'pending'
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('[CASHIER] withdraw error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================================
//  4. GET /api/cashier/transactions
//     → Paginated transaction history
//     Query: ?type=deposit|withdrawal|all&page=1&limit=20
// ============================================================
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20, status, from, to } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (type && type !== 'all') {
      where += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (from) {
      where += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND created_at <= ?';
      params.push(to);
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM transactions ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT id, txn_id, type, amount, bonus_amount, payment_method,
              currency, status, created_at, completed_at
       FROM transactions
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (err) {
    console.error('[CASHIER] transactions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  5. GET /api/cashier/transactions/:txnId
//     → Single transaction detail
// ============================================================
router.get('/transactions/:txnId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { txnId } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM transactions
       WHERE txn_id = ? AND user_id = ?`,
      [txnId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CASHIER] transaction detail error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  6. GET /api/cashier/payment-methods
//     → List saved payment methods for the user
// ============================================================
router.get('/payment-methods', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT id, method_type, provider, last_four, currency,
              is_default, created_at
       FROM payment_methods
       WHERE user_id = ? AND is_active = 1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CASHIER] payment-methods error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  7. POST /api/cashier/payment-methods
//     → Add a new payment method
//     Body: { method_type, provider, last_four, currency? }
// ============================================================
router.post('/payment-methods', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { method_type, provider, last_four, currency } = req.body;

    if (!method_type || !provider || !last_four) {
      return res.status(400).json({
        success: false,
        message: 'method_type, provider and last_four are required'
      });
    }

    // Check if already default → unset others
    const [existing] = await db.query(
      `SELECT COUNT(*) AS cnt FROM payment_methods
       WHERE user_id = ? AND is_active = 1`,
      [userId]
    );
    const isDefault = existing[0].cnt === 0 ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO payment_methods
         (user_id, method_type, provider, last_four, currency, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, method_type, provider, last_four, currency || 'USD', isDefault]
    );

    res.status(201).json({
      success: true,
      message: 'Payment method added',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[CASHIER] add payment-method error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  8. DELETE /api/cashier/payment-methods/:id
//     → Remove a saved payment method
// ============================================================
router.delete('/payment-methods/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const methodId = req.params.id;

    const [result] = await db.query(
      `UPDATE payment_methods SET is_active = 0
       WHERE id = ? AND user_id = ?`,
      [methodId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.json({ success: true, message: 'Payment method removed' });
  } catch (err) {
    console.error('[CASHIER] delete payment-method error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  9. PUT /api/cashier/payment-methods/:id/default
//     → Set a payment method as default
// ============================================================
router.put('/payment-methods/:id/default', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const methodId = req.params.id;

    // Unset all defaults
    await connection.query(
      `UPDATE payment_methods SET is_default = 0
       WHERE user_id = ?`,
      [userId]
    );

    // Set new default
    const [result] = await connection.query(
      `UPDATE payment_methods SET is_default = 1
       WHERE id = ? AND user_id = ? AND is_active = 1`,
      [methodId, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    await connection.commit();
    res.json({ success: true, message: 'Default payment method updated' });
  } catch (err) {
    await connection.rollback();
    console.error('[CASHIER] set default error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================================
//  10. GET /api/cashier/limits
//      → Return deposit / withdrawal limits for the user
// ============================================================
router.get('/limits', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await db.query(
      `SELECT u.vip_level, u.kyc_status
       FROM users u WHERE u.id = ?`,
      [userId]
    );

    const vip = userRows[0]?.vip_level || 0;
    const kyc = userRows[0]?.kyc_status === 'approved';

    // Tier-based limits
    const limits = {
      deposit: {
        min: 10,
        max: kyc ? 50000 + (vip * 25000) : 5000,
        daily: kyc ? 100000 + (vip * 50000) : 10000
      },
      withdrawal: {
        min: 20,
        max: kyc ? 25000 + (vip * 15000) : 2000,
        daily: kyc ? 50000 + (vip * 25000) : 5000,
        monthly: kyc ? 200000 + (vip * 100000) : 20000
      }
    };

    res.json({ success: true, data: limits });
  } catch (err) {
    console.error('[CASHIER] limits error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  11. GET /api/cashier/currencies
//      → Available currencies & exchange rates
// ============================================================
router.get('/currencies', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT code, name, symbol, exchange_rate, is_active
       FROM currencies
       WHERE is_active = 1
       ORDER BY code ASC`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CASHIER] currencies error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  12. POST /api/cashier/convert
//      → Preview currency conversion
//      Body: { from, to, amount }
// ============================================================
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to || !isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: 'from, to and valid amount required'
      });
    }

    const [fromRows] = await db.query(
      `SELECT exchange_rate FROM currencies WHERE code = ? AND is_active = 1`,
      [from.toUpperCase()]
    );
    const [toRows] = await db.query(
      `SELECT exchange_rate FROM currencies WHERE code = ? AND is_active = 1`,
      [to.toUpperCase()]
    );

    if (fromRows.length === 0 || toRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency'
      });
    }

    const FEE_PERCENT = 1.5;
    const rate = parseFloat(toRows[0].exchange_rate)
               / parseFloat(fromRows[0].exchange_rate);
    const gross = parseFloat(amount) * rate;
    const fee   = gross * (FEE_PERCENT / 100);
    const net   = gross - fee;

    res.json({
      success: true,
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: parseFloat(rate.toFixed(6)),
        gross: parseFloat(gross.toFixed(2)),
        fee: parseFloat(fee.toFixed(2)),
        fee_percent: FEE_PERCENT,
        net: parseFloat(net.toFixed(2))
      }
    });
  } catch (err) {
    console.error('[CASHIER] convert error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  13. GET /api/cashier/bonuses
//      → Active bonuses & wagering progress
// ============================================================
router.get('/bonuses', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
         up.id, up.promotion_id, up.status, up.claimed_at,
         p.name, p.bonus_percentage, p.max_bonus,
         p.wagering_requirement, p.expiry_days,
         ub.bonus_balance,
         (SELECT COALESCE(SUM(rake_amount), 0)
          FROM game_history gh
          WHERE gh.user_id = up.user_id
            AND gh.created_at >= up.claimed_at) AS wagered
       FROM user_promotions up
       JOIN promotions p ON p.id = up.promotion_id
       JOIN user_balances ub ON ub.user_id = up.user_id
       WHERE up.user_id = ? AND up.status IN ('active', 'completed')
       ORDER BY up.claimed_at DESC`,
      [userId]
    );

    const bonuses = rows.map(r => {
      const required = parseFloat(r.bonus_balance) * (r.wagering_requirement || 1);
      const wagered  = parseFloat(r.wagered);
      return {
        ...r,
        wagering_required: parseFloat(required.toFixed(2)),
        wagering_completed: parseFloat(wagered.toFixed(2)),
        wagering_remaining: parseFloat(Math.max(0, required - wagered).toFixed(2)),
        wagering_progress: required > 0
          ? parseFloat(Math.min(100, (wagered / required) * 100).toFixed(1))
          : 100
      };
    });

    res.json({ success: true, data: bonuses });
  } catch (err) {
    console.error('[CASHIER] bonuses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  14. POST /api/cashier/bonuses/:id/forfeit
//      → Forfeit an active bonus
// ============================================================
router.post('/bonuses/:id/forfeit', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const promoUserId = req.params.id;

    const [rows] = await connection.query(
      `SELECT up.promotion_id, ub.bonus_balance
       FROM user_promotions up
       JOIN user_balances ub ON ub.user_id = up.user_id
       WHERE up.id = ? AND up.user_id = ? AND up.status = 'active'`,
      [promoUserId, userId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Active bonus not found'
      });
    }

    const bonusBal = parseFloat(rows[0].bonus_balance);

    // Remove bonus balance
    await connection.query(
      `UPDATE user_balances
       SET bonus_balance = 0
       WHERE user_id = ?`,
      [userId]
    );

    // Mark forfeited
    await connection.query(
      `UPDATE user_promotions
       SET status = 'forfeited', forfeited_at = NOW()
       WHERE id = ?`,
      [promoUserId]
    );

    // Log the forfeiture
    const txnId = generateTxnId('FOR');
    await connection.query(
      `INSERT INTO transactions
         (txn_id, user_id, type, amount, currency, status, created_at)
       VALUES (?, ?, 'bonus_forfeit', ?, 'USD', 'completed', NOW())`,
      [txnId, userId, bonusBal]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Bonus forfeited',
      data: { forfeited_amount: bonusBal }
    });
  } catch (err) {
    await connection.rollback();
    console.error('[CASHIER] forfeit error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================================
//  15. GET /api/cashier/summary
//      → Financial summary (total deposited, withdrawn, net)
// ============================================================
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'completed'
                      THEN amount ELSE 0 END), 0) AS total_deposited,
         COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed'
                      THEN amount ELSE 0 END), 0) AS total_withdrawn,
         COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'completed'
                      THEN bonus_amount ELSE 0 END), 0) AS total_bonuses,
         COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'pending'
                      THEN amount ELSE 0 END), 0) AS pending_withdrawals,
         COUNT(CASE WHEN type = 'deposit' THEN 1 END) AS deposit_count,
         COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) AS withdrawal_count
       FROM transactions
       WHERE user_id = ?`,
      [userId]
    );

    const s = rows[0];
    const net = parseFloat(s.total_deposited) - parseFloat(s.total_withdrawn);

    res.json({
      success: true,
      data: {
        total_deposited: parseFloat(s.total_deposited),
        total_withdrawn: parseFloat(s.total_withdrawn),
        total_bonuses: parseFloat(s.total_bonuses),
        pending_withdrawals: parseFloat(s.pending_withdrawals),
        net_profit_loss: parseFloat(net.toFixed(2)),
        deposit_count: parseInt(s.deposit_count),
        withdrawal_count: parseInt(s.withdrawal_count)
      }
    });
  } catch (err) {
    console.error('[CASHIER] summary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  16. GET /api/cashier/available-methods
//      → List all payment methods available in user's region
//      Query: ?type=deposit|withdrawal&currency=USD
// ============================================================
router.get('/available-methods', authenticate, async (req, res) => {
  try {
    const { type = 'deposit', currency = 'USD' } = req.query;

    const [rows] = await db.query(
      `SELECT id, name, slug, type, min_amount, max_amount,
              processing_time, fee_percent, fee_fixed, icon_url,
              is_active
       FROM available_payment_methods
       WHERE is_active = 1
         AND FIND_IN_SET(?, type) > 0
         AND FIND_IN_SET(?, supported_currencies) > 0
       ORDER BY sort_order ASC`,
      [type, currency.toUpperCase()]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CASHIER] available-methods error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  17. POST /api/cashier/crypto-address
//      → Generate / fetch a crypto deposit address
//      Body: { currency: 'BTC'|'ETH'|'USDT' }
// ============================================================
router.post('/crypto-address', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency } = req.body;

    const allowed = ['BTC', 'ETH', 'USDT', 'LTC', 'BCH'];
    const cur = (currency || '').toUpperCase();
    if (!allowed.includes(cur)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported crypto currency'
      });
    }

    // Check for existing active address
    const [existing] = await db.query(
      `SELECT address, qr_code_url, created_at
       FROM crypto_addresses
       WHERE user_id = ? AND currency = ? AND is_active = 1
       ORDER BY created_at DESC LIMIT 1`,
      [userId, cur]
    );

    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0] });
    }

    // Generate placeholder address (integrate real wallet API in prod)
    const address = `0x${require('crypto').randomBytes(20).toString('hex')}`;
    const qrUrl   = `/api/cashier/qr?data=${encodeURIComponent(address)}`;

    await db.query(
      `INSERT INTO crypto_addresses (user_id, currency, address, qr_code_url)
       VALUES (?, ?, ?, ?)`,
      [userId, cur, address, qrUrl]
    );

    res.status(201).json({
      success: true,
      data: { currency: cur, address, qr_code_url: qrUrl }
    });
  } catch (err) {
    console.error('[CASHIER] crypto-address error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  18. POST /api/cashier/responsible-limits
//      → Set responsible gaming deposit limits
//      Body: { daily_limit, weekly_limit, monthly_limit }
// ============================================================
router.post('/responsible-limits', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { daily_limit, weekly_limit, monthly_limit } = req.body;

    // Limits can only be decreased instantly; increases take 24 h
    const [current] = await db.query(
      `SELECT daily_limit, weekly_limit, monthly_limit
       FROM responsible_limits WHERE user_id = ?`,
      [userId]
    );

    let cooldownUntil = null;
    if (current.length > 0) {
      const c = current[0];
      const isIncrease =
        (daily_limit && daily_limit > c.daily_limit) ||
        (weekly_limit && weekly_limit > c.weekly_limit) ||
        (monthly_limit && monthly_limit > c.monthly_limit);

      if (isIncrease) {
        cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    await db.query(
      `INSERT INTO responsible_limits
         (user_id, daily_limit, weekly_limit, monthly_limit, cooldown_until)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         daily_limit    = VALUES(daily_limit),
         weekly_limit   = VALUES(weekly_limit),
         monthly_limit  = VALUES(monthly_limit),
         cooldown_until = VALUES(cooldown_until)`,
      [userId, daily_limit || null, weekly_limit || null,
       monthly_limit || null, cooldownUntil]
    );

    res.json({
      success: true,
      message: cooldownUntil
        ? 'Limit increase will take effect in 24 hours'
        : 'Responsible limits updated',
      data: { daily_limit, weekly_limit, monthly_limit, cooldown_until: cooldownUntil }
    });
  } catch (err) {
    console.error('[CASHIER] responsible-limits error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
//  EXPORT
// ============================================================
module.exports = router;