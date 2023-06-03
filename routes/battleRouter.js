const express = require('express');
const admin = require('firebase-admin');


const battleRouter = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:battle:
 *       type: object
 *       required:
 *         - admin_id
 *         - is_private
 *         - time_validity
 *       properties:
 *         admin_id:
 *            type: "string"
 *         is_private:
 *            type: "boolean"
 *         time_validity:
 *            type: "number"
 */

/**
 * @swagger
 * /battle/create-battle:
 *   post:
 *     summary: create a battle in db
 *     description: creates a battle in db
 *     tags:
 *       - battle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:battle'
 *     responses:
 *       200:
 *         description: Battle created successfully
 *       500:
 *         description: Internal Server Error
 */

battleRouter.post("/create-room", async (req,res) => {
  const db = admin.firestore();

  let usersData = [
    {
      id : req.body.admin_id,
      score : 0
    }
  ]

  let data = {
    createdAt : new Date(),
    isPrivate : req.body.is_private,
    timeValidity : req.body.time_validity,
    players : usersData,
  }

  const newBattleRef = db.collection('battles').doc();  // creates a new battle doc with auto-generated id

  newBattleRef.set(data).then((docRef)=>{
    console.log('Battle created with ID: ', docRef);
    res.status(201).send('Battle created successfully');
  }).catch((error)=>{
    console.error('Error creating battle:', error);
    res.status(500).send('Internal Server Error');
  });
})

module.exports = battleRouter;