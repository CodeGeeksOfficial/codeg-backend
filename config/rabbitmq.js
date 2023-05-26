const amqp = require('amqplib');
const { config } = require('dotenv');

config();

const url = process.env.RABBITMQ_URL || '';

const connectQueue = async () => {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  channel.assertQueue("jobs");
  return channel;
}

module.exports = { connectQueue };