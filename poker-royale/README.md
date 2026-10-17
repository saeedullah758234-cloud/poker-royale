# 🃏 PokerRoyale — Real Money Online Poker Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node->=16.0.0-brightgreen.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0+-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

PokerRoyale is a premium, full-stack, real-money online poker platform. It features a stunning glassmorphism UI, a complete player dashboard, secure OTP-based mobile registration, multi-currency/payment integrations (PayPal, Crypto, Bank, Mobile Wallets), and a highly advanced Super Admin control panel.

---

## ✨ Key Features

### 🎮 Player Interface
*   **Secure Registration**: Mobile OTP verification via Twilio & Bcrypt password hashing.
*   **Game Lobby**: Filterable list of active Texas Hold'em, Omaha, and Short Deck tables.
*   **Immersive Game Table**: Beautiful CSS-rendered poker tables, interactive bet sliders, and live chat.
*   **Tournaments**: Multi-table tournaments (MTT), Sit & Go, Freerolls with live countdowns.
*   **Wallet / Cashier**: Deposit and withdraw using international & local payment gateways.
*   **Promotions & VIP**: 5-Tier loyalty program, referral bonuses, and promo code redemption.
*   **Global Leaderboard**: Track top players by earnings, win rate, and loyalty points.

### 🔐 Super Admin Panel
*   **Dashboard**: Real-time revenue charts (Chart.js), active player counts, and live activity feeds.
*   **User Management**: Ban/suspend users, adjust balances, and view detailed histories.
*   **Financial Control**: Approve, reject, or hold withdrawal requests. Export ledgers to CSV.
*   **Game & Tournament Control**: Create tables, schedule tournaments, pause/cancel games, refund players.
*   **Security & Anti-Fraud**: Multi-account detection, IP blocking, KYC document review.
*   **System Settings**: Toggle maintenance mode, update rake percentages, and configure SMTP/Twilio keys.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
*   **Backend**: Node.js, Express.js
*   **Database**: MySQL (using `mysql2/promise` connection pool)
*   **Authentication**: JSON Web Tokens (JWT)
*   **Integrations**: Twilio (SMS OTP)
*   **Libraries**: Chart.js (Admin Analytics), FontAwesome 6 (Icons)

---

## 📁 Project Structure

```text
poker-royale/
├── admin/                  # Super Admin Panel HTML/CSS/JS
├── assets/                 # Images, Icons, Fonts
├── css/                    # Player site stylesheets
├── database/               # SQL schema and seed data
│   ├── schema.sql
│   └── seed.sql
├── js/                     # Player site JavaScript & API client
│   ├── main.js
│   └── api.js
├── server/                 # Node.js Backend
│   ├── config/             # DB & Environment configs
│   ├── middleware/         # JWT Auth & Role guards
│   ├── routes/             # Express API endpoints
│   ├── .env                # Environment variables (Create this)
│   ├── package.json        # Node dependencies
│   └── server.js           # Main Express server entry point
├── index.html              # Landing Page
├── login.html              # Auth pages...
├── register.html
├── lobby.html
├── table.html
└── ... (other html files)