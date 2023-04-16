import express from 'express';
import { getKey, setKey } from '../controllers/redis-controllers'
import { sendInQueue } from '../controllers/rabbitmq-controllers'
import { randomBytes } from 'crypto';

const codeRouter = express.Router();

const LANGUAGES = ["cpp", "java", "py", "js"];

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:run:
 *       type: object
 *       required:
 *         - language
 *         - code
 *       properties:
 *         language:
 *           type: "string"
 *         code:
 *           type: string
 *         timeout:
 *           type: number
 */


/**
 * @swagger
 * /code/run:
 *   post:
 *     summary: run code API
 *     description: Post the code with payload containing language, code and timeout
 *     tags:
 *       - code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:run'
 *     responses:
 *       200:
 *         description: A process id of the submitted code
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal Server Error
 */

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


/**
 * @swagger
 * /code/status/{id}:
 *   get:
 *     summary: Get status of submitted code request
 *     description: Retrieve a status of submitted code by process id
 *     tags:
 *       - code
 *     parameters:
 *       - name: id
 *         description: ID of the code process to retrieve
 *         in: path
 *         required: true
 *         type: integer
 *         format: int64
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: A code output or execution status
 */

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