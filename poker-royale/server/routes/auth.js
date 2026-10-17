const express = require('express');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const db = require('../config/db');

const router = express.Router();

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// REGISTER API
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, phone, dob, password } = req.body;

        if (!fullName || !email || !phone || !dob || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Check Duplicates
        const [existing] = await db.query('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email or Mobile number already registered.' });
        }

        // Hash Password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate OTP (6 digits)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to Database
        await db.query(
            `INSERT INTO users (full_name, email, phone, date_of_birth, password_hash, phone_verified, otp_code, otp_expires) 
             VALUES (?, ?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
            [fullName, email, phone, dob, passwordHash, otpCode]
        );

        // Send OTP via SMS
        if (twilioClient) {
            await twilioClient.messages.create({
                body: `Your PokerRoyale verification code is: ${otpCode}. It expires in 5 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
        } else {
            console.log(`[TESTING MODE] Twilio SMS not sent. OTP for ${phone} is: ${otpCode}`);
        }

        res.json({ success: true, message: 'Registration successful. OTP sent.' });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// VERIFY OTP API
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required.' });

        const [users] = await db.query('SELECT id, otp_code, otp_expires FROM users WHERE phone = ? LIMIT 1', [phone]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

        const user = users[0];

        if (user.otp_code !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
        }

        if (new Date() > new Date(user.otp_expires)) {
            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
        }

        // Update verified status
        await db.query('UPDATE users SET phone_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?', [user.id]);

        res.json({ success: true, message: 'Phone verified successfully.' });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// RESEND OTP API
router.post('/resend-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required.' });

        const [users] = await db.query('SELECT id, phone_verified FROM users WHERE phone = ? LIMIT 1', [phone]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        if (users[0].phone_verified === 1) return res.status(400).json({ success: false, message: 'Phone already verified.' });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        await db.query('UPDATE users SET otp_code = ?, otp_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?', [newOtp, users[0].id]);

        if (twilioClient) {
            await twilioClient.messages.create({
                body: `Your new PokerRoyale verification code is: ${newOtp}. Expires in 5 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
        } else {
            console.log(`[TESTING MODE] New OTP for ${phone} is: ${newOtp}`);
        }

        res.json({ success: true, message: 'New OTP sent.' });
    } catch (err) {
        console.error('Resend OTP Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports = router;