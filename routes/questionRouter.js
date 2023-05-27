const express = require('express');
const admin = require('firebase-admin');
const questionRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:question:
 *       type: object
 *       properties:
 *         title:
 *            type: "string"
 *         others:
 *            type: "any"
 */

/**
 * @swagger
 * /question/all-questions:
 *   get:
 *     summary: Get all questions
 *     tags:
 *       - question
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: A list of all questions
 */
questionRouter.get('/all-questions', (req, res) => {
  const db = admin.firestore();

  db.collection('questions').get()
    .then((snapshot) => {
      const questions = [];
      snapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() });
      });
      res.json(questions);
    })
    .catch((error) => {
      console.error('Error getting questions', error);
      res.status(500).send('Internal Server Error');
    });
});

/**
 * @swagger
 * /question/get-question-by-id:
 *   get:
 *     summary: Get question by id
 *     tags:
 *       - question
 *     parameters:
 *       - in: query
 *         name: question_id
 *         type: string
 *         required: true
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An object of question
 */
questionRouter.get('/get-question-by-id', (req, res) => {
  const db = admin.firestore();

  const questionId = req.query.question_id;

  if (!questionId) {
    return res.status(400).send('Question Id Required');
  }

  const questionRef = db.collection('questions').doc(questionId);
  questionRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        const questionData = doc.data();
        res.status(200).json(questionData);
      } else {
        res.status(404).send('Question not found');
      }
    })
    .catch((error) => {
      console.error('Error getting question:', error);
      res.status(500).send('Internal Server Error');
    });
});


/**
 * @swagger
 * /question/create-question:
 *   post:
 *     summary: create a question in db
 *     description: creates a question in db
 *     tags:
 *       - question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:question'
 *     responses:
 *       200:
 *         description: Question created successfully
 *       500:
 *         description: Internal Server Error
 */
questionRouter.post('/create-question', (req, res) => {
  const db = admin.firestore();

  db.collection('questions').add(req.body)
    .then((docRef) => {
      console.log('Question added with ID:', docRef.id);
      res.status(201).send('Question created successfully');
    })
    .catch((error) => {
      console.error('Error adding question:', error);
      res.status(500).send('Internal Server Error');
    });
});



module.exports = questionRouter;