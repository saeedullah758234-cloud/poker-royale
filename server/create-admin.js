const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = { host: 'localhost', user: 'root', password: '', database: 'poker_royale' };

async function run() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        const user = 'admin';
        const pass = 'admin123';
        const email = 'admin@pokerroyale.com';

        // Purana user delete karein agar koi hai
        await conn.execute("DELETE FROM users WHERE username = ? OR email = ?", [user, email]);

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(pass, salt);

        // Naya Super Admin insert karein
        await conn.execute(
            "INSERT INTO users (username, email, password_hash, is_admin, is_verified) VALUES (?, ?, ?, 1, 1)",
            [user, email, hash]
        );

        // Wallet setup
        const [rows] = await conn.execute("SELECT id FROM users WHERE username = ?", [user]);
        await conn.execute("INSERT INTO wallets (user_id, balance) VALUES (?, 1000000.00)", [rows[0].id]);

        console.log(`\n✅ SUPER ADMIN CREATED SUCCESSFULLY!`);
        console.log(`Username: admin`);
        console.log(`Password: admin123\n`);
        process.exit();
    } catch (e) { console.log(e); process.exit(1); }
}
run();