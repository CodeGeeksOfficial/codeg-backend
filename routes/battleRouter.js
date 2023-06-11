const express = require('express');
const admin = require('firebase-admin');
const { decodeAccessToken } = require('../utils/firebase-utils');
const isBattleCompleted = require('../utils/is-battle-completed');

const battleRouter = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     payload:battle:
 *       type: object
 *       required:
 *         - no_of_questions
 *         - is_private
 *         - battle_name
 *         - time_validity
 *       properties:
 *         no_of_questions:
 *            type: "number"
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
      let noOfQuestions = 3;
      if(req.body?.no_of_questions > 0 && req.body?.no_of_questions <= 5){
        noOfQuestions = req.body?.no_of_questions
      }
      if (questionsList.length > noOfQuestions) {
        let questionsToRemove = questionsList.length - noOfQuestions;

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
 *   post:
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
 *         description: Joined Battle successfully
 *       401:
 *         description: Error verifying access token
 *       500:
 *         description: Internal Server Error
 */

battleRouter.post("/join-battle", async (req, res) => {
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
          // check for multiple entries
          if(!battleData?.activeUsers.includes(decodedToken.user_id)){
            battleDocRef.update({activeUsers:[...battleData?.activeUsers,decodedToken.user_id]})
            return res.status(200).send('Joined Battle Successfully')
          }else{
            return res.status(200).send('Already a player')
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
 * /battle/start-battle:
 *   post:
 *     summary: Start a battle in db
 *     description: starts a battle in db
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
 *         description: Started Battle successfully
 *       401:
 *         description: Error verifying access token
 *       500:
 *         description: Internal Server Error
 */

battleRouter.post("/start-battle", async (req, res) => {
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
          // check for multiple startedAt key
          if(!battleData?.startedAt && battleData?.activeUsers[0] === decodedToken.user_id){
            let players = {}
            battleData?.activeUsers.forEach((user)=>{
              players = {
                ...players,
                [user]:{
                  score:0,
                  submissions:[]
                }
              }
            })
            console.log(players)
            battleDocRef.update({
              startedAt:new Date(),
              players:players
            })
            return res.status(200).send('Started Battle Successfully')
          }else{
            return res.status(500).send('Internal Server Error');
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
 * /battle/get-details-by-id:
 *   get:
 *     summary: Details of a battle
 *     description: Returns all details of the battle
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
battleRouter.get("/get-details-by-id", async (req, res) => {

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
    if (battleData.startedAt) {
      const isCompleted = isBattleCompleted(battleData.startedAt, battleData.timeValidity);
      if (isCompleted) {
        return res.status(200).json({ 
          id:battleId,
          status:"completed", 
          ...battleData, 
          createdAt:battleData?.createdAt?.toDate().toString(),
          startedAt:battleData?.startedAt?.toDate().toString(),
        });
      } else {
        return res.status(200).json({
          id:battleId,
          status:"arena",
          ...battleData,
          createdAt:battleData?.createdAt?.toDate().toString(),
          startedAt:battleData?.startedAt?.toDate().toString(),
        });
      }
    } else {
      return res.status(200).json({
        id:battleId,
        status:"lobby",
        ...battleData,
        createdAt:battleData?.createdAt?.toDate().toString(),
        startedAt:"",
      });
    }
  } else {
    return res.json(null);
  }
})

/**
 * @swagger
 * /battle/get-public-battles:
 *   get:
 *     summary: Get public battles list
 *     description: Returns all public battles' data
 *     tags:
 *       - battle
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Internal Server Error
 */
battleRouter.get("/get-public-battles", async (req, res) => {
  try {
    const db = admin.firestore();

    const battlesCollectionRef = db.collection('battles');
  
    let snapshot = await battlesCollectionRef.where('isPrivate','==',false).get()
    let publicBattlesData = []
    snapshot.docs.forEach((doc)=>{
      publicBattlesData.push({id:doc.id,...doc.data()})
    })
    return res.status(200).json(publicBattlesData)
  } catch (error) {
    console.error('Error getting battle data:', error);
    return res.status(500).send('Internal Server Error');
  }
})

module.exports = battleRouter;