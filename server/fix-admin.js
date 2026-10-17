const mysql = require('mysql2/promise');

// Database Connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'poker_royale'
};

async function start() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Yahan apna username likhein jo aapne registration ke waqt rakha tha
        const myUsername = 'khansab'; 

        const [result] = await connection.execute(
            "UPDATE users SET is_admin = 1 WHERE username = ?", 
            [myUsername]
        );

        if (result.affectedRows > 0) {
            console.log(`\n\x1b[32m%s\x1b[0m`, `✅ MUBARAK HO! User '${myUsername}' ab Super Admin ban chuka hai.`);
            console.log(`Ab aap http://127.0.0.1:3000/admin.html open kar sakte hain.\n`);
        } else {
            console.log(`\n\x1b[31m%s\x1b[0m`, `❌ ERROR: Username '${myUsername}' database mein nahi mila.`);
            console.log(`Pehle register.html par ja kar '${myUsername}' naam se account banayein.\n`);
        }
        
        await connection.end();
    } catch (err) {
        console.error(`\n❌ DATABASE ERROR:`, err.message);
    }
}

start();