const express = require('express');
const admin = require('firebase-admin');
const { decodeAccessToken } = require('../utils/firebase-utils');

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
 *         - battle_name
 *         - time_validity
 *       properties:
 *         admin_id:
 *            type: "string"
 *         is_private:
 *            type: "boolean"
 *         battle_name:
 *            type: "string"
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
 *     security:
 *       - bearerAuth: []   # Indicates that the API requires a bearer token in the header
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

battleRouter.post("/create-battle", async (req, res) => {

  const accessToken = req.headers.authorization;

  try {
    const decodedToken = await decodeAccessToken(accessToken);
    try {
      const db = admin.firestore();
      const questionsSnapshot = await db.collection('questions').get();
      let questionsList = questionsSnapshot.docs.map((doc) => doc.id);

      if (questionsList.length > 5) {
        let questionsToRemove = questionsList.length - 5;

        while (questionsToRemove > 0) {
          const randomIndex = Math.floor(Math.random() * questionsList.length);
          questionsList.splice(randomIndex, 1);
          questionsToRemove--;
        }
      }

      let data = {
        createdAt: new Date(),
        isPrivate: req.body.is_private,
        activeUsers: [decodedToken.user_id],
        name: req.body.battle_name,
        timeValidity: req.body.time_validity,
        questions: questionsList
      }

      const newBattleRef = db.collection('battles').doc();  // creates a new battle doc with auto-generated id

      await newBattleRef.set(data)
      res.status(201).send(newBattleRef.id);

    } catch (error) {
      console.error('Error creating battle:', error);
      res.status(500).send('Internal Server Error');
    }

  } catch (error) {
    console.error('Error verifying access token:', error);
    return res.status(401).send('Unauthorized');
  }
})

/**
 * @swagger
 * /battle/join-battle:
 *   get:
 *     summary: Join a battle in db
 *     description: joins a battle in db
 *     tags:
 *       - battle
 *     security:
 *       - bearerAuth: []   # Indicates that the API requires a bearer token in the header
 *     parameters:
 *       - name: battle_id
 *         description: Battle id
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Battle created successfully
 *       401:
 *         description: Error verifying access token
 *       500:
 *         description: Internal Server Error
 */

battleRouter.get("/join-battle", async (req, res) => {
  const accessToken = req.headers.authorization;

  try {
    const decodedToken = await decodeAccessToken(accessToken);
    const db = admin.firestore();

    const battleId = req.query.battle_id;

    if (!battleId) {
      return res.status(400).send('Battle Id Required');
    }

    // Check if doc for battleID exists
    const battlesCollectionRef = db.collection('battles');
    const battleDocRef = battlesCollectionRef.doc(battleId);
    battleDocRef
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          const battleData = doc.data();

          // Check if user already in battleId
          const snapshot = await battlesCollectionRef.where('activeUsers', 'array-contains', decodedToken.user_id).limit(1).get();
          if (snapshot.empty) {
            // Check if battle already started or not
            if (battleData.startedAt) {
              // console.log("Battle already started !!")
              return res.json(null);
            } else {
              battleDocRef.update({
                players: [...battleData.players, { id: decodedToken.uid, score: 0 }],
                activeUsers: [...battleData.activeUsers, decodedToken.uid]
              }).then(() => {
                // Join new user to battleId successfully
                return res.json(battleId);
              }).catch(() => {
                return res.json(null);
              })
            }
          } else {
            // console.log("User already in a battle !!")
            return res.json(null);
            // const userBattles = snapshot.docs;
            // return res.send(userBattles[0].id);
          }
        } else {
          return res.status(404).send('Battle not found');
        }
      })
      .catch((error) => {
        console.error('Error getting battle data:', error);
        return res.status(500).send('Internal Server Error');
      });
  } catch (error) {
    console.error('Error verifying access token:', error);
    return res.status(401).send('Unauthorized');
  }
})

/**
 * @swagger
 * /battle/status:
 *   get:
 *     summary: Status of a battle
 *     description: Returns the status of the battle
 *     tags:
 *       - battle
 *     parameters:
 *       - name: battle_id
 *         description: Battle id
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: completed or arena or lobby or null
 *       500:
 *         description: Internal Server Error
 */
battleRouter.get("/status", async (req, res) => {

  const db = admin.firestore();
  const battleId = req.query.battle_id;

  if (!battleId) {
    return res.status(400).send('Battle Id Required');
  }

  const battlesCollectionRef = db.collection('battles');
  const battleDocRef = battlesCollectionRef.doc(battleId);
  const doc = await battleDocRef.get()

  if (doc.exists) {
    const battleData = doc.data();
    const createdAtTimestamp = battleData.createdAt.toDate();
    const currentTimestamp = new Date();
    const validTillTimestamp = new Date(createdAtTimestamp.getTime() + (battleData.timeValidity) * 60000);

    if (validTillTimestamp > currentTimestamp) {
      if (battleData.startedAt) {
        return res.status(200).json({ status: "arena" });
      } else {
        return res.status(200).json({ status: "lobby" });
      }
    } else {
      return res.status(200).json({ status: "completed" });
    }
  } else {
    return res.json(null);
  }
})

module.exports = battleRouter;