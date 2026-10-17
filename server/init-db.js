const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    console.log("⏳ Initializing Database and Fixing Columns...");
    
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: ''
        });

        // 1. Create Database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS poker_royale`);
        await connection.query(`USE poker_royale`);

        // 2. Disable foreign key checks for clean recreate/update
        await connection.query(`SET FOREIGN_KEY_CHECKS = 0`);

        // 3. Create Users Table with VARCHAR(255) password_hash
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                avatar LONGTEXT NULL,
                is_admin TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Ensure column sizes are correct in existing tables
        await connection.query(`ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL`);
        await connection.query(`ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NOT NULL`);
        await connection.query(`ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NOT NULL`);

        // 4. Create Wallets Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                balance DECIMAL(15,2) DEFAULT 1000.00,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Create Tables Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                game_type ENUM('texas', 'omaha', 'shortdeck') DEFAULT 'texas',
                small_blind DECIMAL(15,2) NOT NULL,
                big_blind DECIMAL(15,2) NOT NULL,
                min_buy_in DECIMAL(15,2) NOT NULL,
                max_buy_in DECIMAL(15,2) NOT NULL,
                max_players INT DEFAULT 9,
                status ENUM('active', 'inactive') DEFAULT 'active'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. Create Settings Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Default Site Settings
        const settings = [
            ['default_currency', '$'],
            ['currency_code', 'USD'],
            ['enable_holdem', '1'],
            ['enable_omaha', '1'],
            ['enable_shortdeck', '1'],
            ['maintenance_mode', '0'],
            ['site_announcement', 'Welcome to PokerRoyale!']
        ];

        for (const [key, val] of settings) {
            await connection.query(
                `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
                [key, val, val]
            );
        }

        // 7. Reset and Setup Super Admin
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        
        // Remove old admin if exists to ensure fresh hash
        await connection.query(`DELETE FROM users WHERE username = 'admin' OR email = 'admin@pokerroyale.com'`);

        const [adminResult] = await connection.query(
            `INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)`,
            ['admin', 'admin@pokerroyale.com', adminPasswordHash, 1]
        );

        // Add Admin Wallet
        await connection.query(
            `INSERT INTO wallets (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = 10000.00`,
            [adminResult.insertId, 10000.00]
        );

        await connection.query(`SET FOREIGN_KEY_CHECKS = 1`);

        console.log("=================================================");
        console.log("✅ DATABASE & TABLES SETUP SUCCESSFUL!");
        console.log("-------------------------------------------------");
        console.log("SUPER ADMIN CREDENTIALS:");
        console.log("Username: admin");
        console.log("Password: admin123");
        console.log("Email:    admin@pokerroyale.com");
        console.log("=================================================");
        process.exit(0);
    } catch (err) {
        console.error("❌ Database initialization error:", err);
        process.exit(1);
    }
}

initializeDatabase();