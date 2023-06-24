const express = require('express');
const { getKey, setKey } = require('../controllers/redis-controllers')
const { sendInQueue } = require('../controllers/rabbitmq-controllers')
const { randomBytes } = require('crypto');
const { decodeAccessToken } = require('../utils/firebase-utils');
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
 * components:
 *   schemas:
 *     payload:update-practice-submission:
 *       type: object
 *       required:
 *         - process_id
 *         - question_id 
 *       properties:
 *         process_id:
 *           type: string
 *         question_id:
 *           type: string
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
 *         test_inputs:
 *           type: "array<any>"
 */

/**
 * @swagger
 * /code/question-run:
 *   post:
 *     summary: run code API for question
 *     description: Post the code with payload containing language, code, test_inputs and timeout and question_id as param
 *     tags:
 *       - code
 *     security:
 *       - bearerAuth: []
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
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: `Internal Server Error: ${err}` });
  }

  res.status(200).send(folder_name);
})

/**
 * @swagger
 * /code/question-submit:
 *   post:
 *     summary: submit code API for question
 *     description: Post the code with payload containing language, code and timeout and question_id as param
 *     tags:
 *       - code
 *     security:
 *       - bearerAuth: []
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

codeRouter.post("/question-submit", async (req, res) => {
  const folder_name = randomBytes(20).toString("hex"); // Random Folder name
  const accessToken = req.headers.authorization;

  try {
    const decodedToken = await decodeAccessToken(accessToken);
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

      // If timeout is not received, set it to 15 sec
      if (data.timeout === undefined) {
        data.timeout = 15000;
      }

      const db = admin.firestore();
      const questionRef = db.collection('questions').doc(question_id);
      const doc = await questionRef.get();
      if (doc.exists) {
        const questionData = doc.data();
        if (questionData.testcases && questionData.solution) {
          data.solution = questionData.solution[0];
          data.test_inputs = questionData.testcases;
        } else {
          return res.status(500).send('Invalid Question in db');
        }
      } else {
        return res.status(404).send('Question not found');
      }

      // *** Prepare data and Push in Queue *** //

      // TODO: commented only for testing, to be removed
      await sendInQueue("multiExecutionJobs", JSON.stringify(data));
      await setKey(folder_name, "Queued");

      console.log(`Request ${folder_name} received - multiExecutionJobs`);

      // Create submission in firestore with docId as folder_name
      const newSubmissionDocRef = db.collection('submissions').doc(folder_name);
      let submissionData = {
        createdAt: new Date(),
        solution: data?.input_code,
        timeout:data?.timeout,
        questionId:question_id,
        userId:decodedToken?.user_id
      }
      await newSubmissionDocRef.set(submissionData)
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: `Internal Server Error: ${err}` });
    }
  } catch (error) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  res.status(200).send(folder_name);
})

/**
 * @swagger
 * /code/update-submission:
 *   post:
 *     summary: Update status of submitted code
 *     description: Update the submission in firestore and give user respective score for that
 *     tags:
 *       - code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:update-practice-submission'
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal Server Error
 */

codeRouter.post("/update-submission", async (req, res) => {
  const accessToken = req.headers.authorization;

  let reqData = {
    processId:req.body.process_id,
    questionId:req.body.question_id
  };

  if(reqData.processId === undefined ||reqData.questionId === undefined){
    return res.status(400).send({error: "Invalid Request Payload"})
  }

  try {
    const decodedToken = await decodeAccessToken(accessToken);
    
    try {
      const db = admin.firestore();
      const submissionsRef = db.collection('submissions')
      const submissionDocRef = submissionsRef.doc(reqData?.processId)
      const questionDocRef = db.collection('questions').doc(reqData?.questionId)
      const promise1 = submissionDocRef.get();
      const promise2 = questionDocRef.get();
      const promise3 = getKey(reqData?.processId)
      const submissionDoc = await promise1;
      const questionDoc = await promise2;
      const submissionResult = JSON.parse(await promise3);

      if(submissionDoc.exists && questionDoc.exists && submissionResult){
        const questionDocData = questionDoc.data()

        let updatedSubmissionData = {
          score:"0",
          status:submissionResult
        }

        let successTestCasesCount = 0
        submissionResult.forEach((status)=>{
          if (status === "Success") {
            successTestCasesCount++;
          }
        })

        // Check if any one 'Success' test case
        if(successTestCasesCount>0){
          const submissionScore = ((Number(questionDocData?.points)/questionDocData?.testcases.length)*successTestCasesCount).toFixed(2)
          updatedSubmissionData.score = submissionScore
        }

        // Update submission doc with updatedSubmissionData
        await submissionDocRef.update(updatedSubmissionData)
        return res.status(200).send({message:"Submission Updated Successfully"})
      }else{
        return res.status(400).send({error: "Invalid IDs in Request Payload"})
      }
    } catch(error) {
      console.log(error);
      return res.status(500).send("Internal Server Error")
    }
  } catch (error) {
    return res.status(401).send({ error: "Unauthorized" });
  }
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