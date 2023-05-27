const express = require('express');
const admin = require('firebase-admin');
const userRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:user:
 *       type: object
 *       required:
 *         - uuid
 *       properties:
 *         uuid:
 *           type: "string"
 *         email:
 *            type: "string"
 *         others:
 *            type: "any"
 */


/**
 * @swagger
 * /user/all-users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - user
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: A list of all users
 */
userRouter.get('/all-users', (req, res) => {
  const db = admin.firestore();

  // Access Firestore collections and documents as needed
  db.collection('users').get()
    .then((snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        users.push(doc.data());
      });
      res.json(users);
    })
    .catch((error) => {
      console.error('Error getting users', error);
      res.status(500).send('Internal Server Error');
    });
});

/**
 * @swagger
 * /user/update-user:
 *   post:
 *     summary: update or create an user in db
 *     description: updates and existing user or creates one with uuid
 *     tags:
 *       - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:user'
 *     responses:
 *       200:
 *         description: User created successfully
 *       400:
 *         description: UUID Not Received
 *       500:
 *         description: Internal Server Error
 */

userRouter.post('/update-user', (req, res) => {
  const db = admin.firestore();
  const uuid = req.body.uuid;

  if (!uuid) {
    return res.status(400).send('UUID Required');
  }

  db.collection('users').doc(uuid).set(req.body)
    .then((docRef) => {
      console.log('User added with ID:', docRef);
      res.status(201).send('User created successfully');
    })
    .catch((error) => {
      console.error('Error adding user:', error);
      res.status(500).send('Internal Server Error');
    });
});

module.exports = userRouter;