const amqp = require('amqplib');
const { config } = require('dotenv');

config();

const url = process.env.RABBITMQ_URL || '';

const connectQueue = async () => {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  channel.assertQueue("singleExecutionJobs");
  channel.assertQueue("multiExecutionJobs");
  return channel;
}

module.exports = { connectQueue };