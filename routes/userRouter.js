const express = require('express');
const admin = require('firebase-admin');
const userRouter = express.Router();

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Get all users
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
userRouter.get('/allusers', (req, res) => {
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

userRouter.post('/update-user', (req, res) => {
  const db = admin.firestore();

  const newUser = {
    name: req.body.name,
    email: req.body.email,
  };

  db.collection('users').doc("ABC").set(newUser)
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