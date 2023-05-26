const Redis = require("ioredis");
const { config } = require('dotenv');

config();

const client = new Redis(process.env.REDIS_URL || "");

process.on('exit', () => {
  console.log("[server] Closing Redis Connection");
  client.quit();
});

module.exports = client;