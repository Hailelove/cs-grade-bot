// module.exports = pool;
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // This is mandatory for Render PostgreSQL
  },
});

module.exports = pool;
