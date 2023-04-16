import amqp from 'amqplib';
import { config } from 'dotenv';

config();

const url = process.env.RABBITMQ_URL || '';

export const connectQueue = async () => {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  channel.assertQueue("jobs");
  return channel;
}

export default connectQueue;