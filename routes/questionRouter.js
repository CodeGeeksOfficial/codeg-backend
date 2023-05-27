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
        questions.push(doc.data());
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