import amqp from 'amqplib';

const url = 'amqps://xonzmodr:6n_tn1QctLqQURxoTGV_8GQatKhSisGX@puffin.rmq2.cloudamqp.com/xonzmodr';

export const connectQueue = async () => {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  channel.assertQueue("jobs");
  return channel;
}

export default connectQueue;