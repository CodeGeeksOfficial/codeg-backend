const express = require('express');
const { getKey, setKey } = require('../controllers/redis-controllers')
const { sendInQueue } = require('../controllers/rabbitmq-controllers')
const { randomBytes } = require('crypto');
const admin = require('firebase-admin');

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
    await sendInQueue("singleExecutionJobs", JSON.stringify(data));
    await setKey(folder_name, "Queued");

    console.log(`Request ${folder_name} received - singleExecutionJobs`);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: `Internal Server Error: ${err}` });
  }

  res.send(folder_name);
})

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:question-run:
 *       type: object
 *       required:
 *         - language
 *         - code
 *       properties:
 *         language:
 *           type: string
 *         code:
 *           type: string
 *         timeout:
 *           type: number
 *         test-inputs:
 *           type: "array<any>"
 */

/**
 * @swagger
 * /code/question-run:
 *   post:
 *     summary: run code API for question
 *     description: Post the code with payload containing language, code and timeout and question_id as param
 *     tags:
 *       - code
 *     parameters:
 *       - in: query
 *         name: question_id
 *         type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:question-run'
 *     responses:
 *       200:
 *         description: A process id of the submitted code
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal Server Error
 */

codeRouter.post("/question-run", async (req, res) => {
  const folder_name = randomBytes(20).toString("hex"); // Random Folder name
  try {
    const question_id = req.query.question_id;
    if (!question_id) {
      return res.status(400).send({ error: "Question Id is required" });
    }

    // Extract Data received from the request body
    let data = {
      input_code: {
        language: req.body.language,
        code: req.body.code,
      },
      folder_name: folder_name,
      test_inputs: req.body.test_inputs,
      timeout: req.body.timeout,
    };

    // If language is not received, return 400 BAD Request
    if (data.input_code.language === undefined) {
      return res.status(400).send({ error: "Language Not Received" });
    }

    if (!LANGUAGES.includes(data.input_code.language)) {
      return res.status(400).send({ error: "Language Not Supported" });
    }

    // If code is not received, return 400 BAD Request
    if (data.input_code.code === undefined) {
      return res.status(400).send({ error: "Code Not Received" });
    }

    // If input is not received, set it as an empty string
    if (data.test_inputs === undefined) {
      data.test_inputs = [""];
    }

    // If timeout is not received, set it to 15 sec
    if (data.timeout === undefined) {
      data.timeout = 15000;
    }

    const db = admin.firestore();
    console.log(question_id);
    const questionRef = db.collection('questions').doc(question_id);
    const doc = await questionRef.get();
    if (doc.exists) {
      const questionData = doc.data();
      data.solution = questionData.solution[0];
    } else {
      return res.status(404).send('Question not found');
    }

    // *** Prepare data and Push in Queue *** //
    await sendInQueue("multiExecutionJobs", JSON.stringify(data));
    await setKey(folder_name, "Queued");

    console.log(`Request ${folder_name} received - multiExecutionJobs`);
    console.log(data);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: `Internal Server Error: ${err}` });
  }

  res.status(200).send(folder_name);
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

module.exports = codeRouter;