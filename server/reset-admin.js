const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database Connection Settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'poker_royale'
};

async function reset() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const username = 'khansab'; // Aapka username
        const newPassword = 'Admin@123'; // Naya password jo set hoga
        
        // 1. Password ko hash karein
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // 2. Database mein update karein (Admin Rights + New Password)
        const [result] = await connection.execute(
            "UPDATE users SET password_hash = ?, is_admin = 1 WHERE username = ?", 
            [passwordHash, username]
        );

        if (result.affectedRows > 0) {
            console.log(`\n\x1b[32m%s\x1b[0m`, `✅ SUCCESS: Admin Password Reset Ho Gaya Hai!`);
            console.log(`--------------------------------------`);
            console.log(`Username: ${username}`);
            console.log(`Password: ${newPassword}`);
            console.log(`URL: http://127.0.0.1:3000/login.html`);
            console.log(`--------------------------------------\n`);
        } else {
            console.log(`\n\x1b[31m%s\x1b[0m`, `❌ ERROR: Username '${username}' nahi mila. Pehle register karein.`);
        }
        
        await connection.end();
        process.exit();
    } catch (err) {
        console.error(`\n❌ ERROR:`, err.message);
        process.exit(1);
    }
}

reset();