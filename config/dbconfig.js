const { Client } = require('pg');
const dotenv = require('dotenv').config({ path: './config.env' });

// *** DB Connection ***
const client = new Client({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER_DB,
  database: process.env.POSTGRES_USER_DB,
  password: process.env.POSTGRES_PASSWORD
});

client.connect().then(() => {
  console.log("DB Connected");
});

module.exports = client;