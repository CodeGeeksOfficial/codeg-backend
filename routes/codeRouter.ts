import express from 'express';
import { getKey, setKey } from '../controllers/redis-controllers'
import { sendInQueue } from '../controllers/rabbitmq-controllers'
import { randomBytes } from 'crypto';

const codeRouter = express.Router();

const LANGUAGES = ["cpp", "java", "py", "js"];

codeRouter.post("/run", async (req, res) => {
  const folder_name = randomBytes(20).toString("hex"); // Random Folder name
  try {
    // Extract Data received from the API
    let data = {
      language: req.body.language,
      code: req.body.code,
      folder_name: folder_name,
      input: req.body.input,
      timeout: req.body.timeout,
    };

    // If language is not received, return 400 BAD Request
    if (data.language === undefined) {
      return res.status(400).send({ error: "Language Not Received" });
    }

    if (!LANGUAGES.includes(data.language)) {
      return res.status(400).send({ error: "Language Not Supported !" });
    }

    // If code is not received, return 400 BAD Request
    if (data.code === undefined) {
      return res.status(400).send({ error: "Code Not Received" });
    }

    // If input is not received, set it as an empty string
    if (data.input === undefined) {
      data.input = "";
    }

    // If timeout is not received, set it to 15 sec
    if (data.timeout === undefined) {
      data.timeout = 15000;
    }

    // *** Prepare data and Push in Queue *** //
    await sendInQueue(JSON.stringify(data));
    await setKey(folder_name, "Queued");

    console.log(`Request ${folder_name} received`);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: `Internal Server Error: ${err}` });
  }

  res.send(folder_name);
})

codeRouter.get("/status/:id", async (req, res) => {
  let key = req.params.id

  if (key === undefined) {
    return res.status(400).send({ status: "Key not received" });
  }
  try {
    const result = await getKey(key);
    return res.status(200).send({ value: result });
  }
  catch (err) {
    return res.status(500).send({ error: err });
  }
});

export default codeRouter;