require('dotenv').config({'path': '../.env'});
const mysql = require('mysql2/promise');

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rugori_gaz_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the database connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection established successfully.');
        connection.release();
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }

})();

module.exports = pool;
