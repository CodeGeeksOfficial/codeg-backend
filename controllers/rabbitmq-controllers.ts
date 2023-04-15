import { connectQueue } from "../config/rabbitmq";

let queueChannel: any;

export const sendInQueue = async (data: string) => {
  if (queueChannel) { // Queue channel is connected
    try {
      queueChannel.sendToQueue("jobs", Buffer.from(data));
    } catch (err) {
      console.log(`Error sending in Queue Service : ${err}`);
    }
  } else { // If not connected
    queueChannel = await connectQueue();
    sendInQueue(data);
  }
};