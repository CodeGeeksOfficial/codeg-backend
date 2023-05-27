const { connectQueue } = require("../config/rabbitmq");

let queueChannel;

const sendInQueue = async (queueName, data) => {
  if (queueChannel) { // Queue channel is connected
    try {
      queueChannel.sendToQueue(queueName, Buffer.from(data));
    } catch (err) {
      console.log(`Error sending in Queue Service : ${err}`);
    }
  } else { // If not connected
    queueChannel = await connectQueue();
    sendInQueue(queueName, data);
  }
};

module.exports = { sendInQueue }