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
    const db = admin.firestore();

    let usersData = [
      {
        id: decodedToken.user_id,
        score: 0
      }
    ]

    let data = {
      createdAt: new Date(),
      isPrivate: req.body.is_private,
      users: [decodedToken.user_id],
      name: req.body.battle_name,
      timeValidity: req.body.time_validity,
      players: usersData,
    }

    const newBattleRef = db.collection('battles').doc();  // creates a new battle doc with auto-generated id

    newBattleRef.set(data).then((docRef) => {
      console.log('Battle created with ID: ', newBattleRef.id);
      res.status(201).send(newBattleRef.id);
    }).catch((error) => {
      console.error('Error creating battle:', error);
      res.status(500).send('Internal Server Error');
    });

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

battleRouter.get("/join-battle",async (req,res) => {
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
          const snapshot = await battlesCollectionRef.where('users', 'array-contains', decodedToken.user_id).limit(1).get();
          if (snapshot.empty) {
            // Check if battle already started or not
            if(battleData.startedAt){
              // console.log("Battle already started !!")
              return res.json(null);
            }else{
              battleDocRef.update({
                players:[...battleData.players,{id:decodedToken.uid,score:0}],
                users:[...battleData.users,decodedToken.uid]
              }).then(()=>{
                // Join new user to battleId successfully
                return res.json(battleId);
              }).catch(()=>{
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
  }catch(error){
    console.error('Error verifying access token:', error);
    return res.status(401).send('Unauthorized');
  }
})
module.exports = battleRouter;