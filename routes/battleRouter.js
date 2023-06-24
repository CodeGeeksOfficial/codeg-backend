const express = require('express');
const admin = require('firebase-admin');
const { decodeAccessToken } = require('../utils/firebase-utils');
const isBattleCompleted = require('../utils/is-battle-completed');
const updateScoreAndRank = require('../utils/update-score-and-rank');
const { getKey } = require('../controllers/redis-controllers');

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
 * components:
 *   schemas:
 *     payload:update-submission:
 *       type: object
 *       required:
 *         - process_id
 *         - battle_id 
 *         - question_id 
 *       properties:
 *         process_id:
 *           type: string
 *         battle_id:
 *           type: string
 *         question_id:
 *           type: string
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
    const usersCollectionRef = db.collection('users');
    const battleDocRef = battlesCollectionRef.doc(battleId);

    const updateUsersCollection = async (activeUsersArray) => {
      let playersData = activeUsersArray.map(async (userId)=>{
        let userDocRef = usersCollectionRef.doc(userId)
        let userProfileData = (await userDocRef.get()).data()
        let userBattlesList = userProfileData?.battles || []
        if(!userBattlesList.includes(battleId)){
          await userDocRef.update({
            battles:[...userBattlesList,battleId],
          })
        }
        return new Promise((resolve,reject)=>{
          resolve({
            [userId]:{
              score:0,
              rank:null,
            }
          })
        })
      })
      return Promise.all(playersData)
    }

    battleDocRef
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          const battleData = doc.data();
          // check for multiple startedAt key
          if(!battleData?.startedAt && battleData?.activeUsers[0] === decodedToken.user_id){
            let playersData = {}
            let players = await updateUsersCollection(battleData?.activeUsers)
            players.forEach((data)=>{
              playersData = {...playersData,...data}
            })
            await battleDocRef.update({
              startedAt:new Date(),
              players:playersData
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
 * /battle/update-submission:
 *   post:
 *     summary: Update status of submitted code
 *     description: Update the submission in firestore and give user respective score for that
 *     tags:
 *       - battle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/payload:update-submission'
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal Server Error
 */

battleRouter.post("/update-submission", async (req, res) => {
  const accessToken = req.headers.authorization;

  let reqData = {
    processId:req.body.process_id,
    battleId:req.body.battle_id,
    questionId:req.body.question_id
  };

  if(reqData.processId === undefined || reqData.battleId === undefined ||reqData.questionId === undefined){
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
        const submissionDocData = submissionDoc.data()
        const questionDocData = questionDoc.data()

        let updatedSubmissionData = {
          battleId:reqData?.battleId,
          score:"0",
          status:submissionResult
        }

        let successTestCasesCount = 0
        submissionResult.forEach((status)=>{
          if (status === "Success") {
            successTestCasesCount++;
          }
        })
        // console.log(successTestCasesCount)

        // Check if any one 'Success' test case
        if(successTestCasesCount>0){
          const submissionScore = ((Number(questionDocData?.points)/questionDocData?.testcases.length)*successTestCasesCount).toFixed(2)
          updatedSubmissionData.score = submissionScore
          // console.log(updatedSubmissionData)
          const prevSubmissionsSnapshot = (await submissionsRef.where('questionId','==',reqData?.questionId).where('userId','==',submissionDocData.userId).where('battleId','==',reqData?.battleId).get()).docs
          let previousSubmissionsWithHigherScore = prevSubmissionsSnapshot.filter((submission)=>{
            return submission.data().score > submissionScore
          })
          if(prevSubmissionsSnapshot.length === 0 || previousSubmissionsWithHigherScore.length === 0){
            // Rank increase
            let scoreToBeIncremented = submissionScore
            if(prevSubmissionsSnapshot.length !== 0){
              let nextSmallerScore = prevSubmissionsSnapshot[0].data().score;
              prevSubmissionsSnapshot.forEach((submission)=>{
                if(submission.data().score > nextSmallerScore){
                  nextSmallerScore = submission.data().score
                }
              })
              scoreToBeIncremented = (submissionScore - nextSmallerScore).toFixed(2)
            }
            // console.log('Score to increase: ', scoreToBeIncremented)
            const battleDocRef = db.collection('battles').doc(reqData?.battleId)
            const battleDoc = await battleDocRef.get()
            let battleDocData = battleDoc.data();
            let newBattlePlayersLeaderboard = await updateScoreAndRank(battleDocData.players,submissionDocData.userId,scoreToBeIncremented)

            // Update new leaderboard with updated ranks and scores
            await battleDocRef.update({players:newBattlePlayersLeaderboard})
            // console.log(newBattlePlayersLeaderboard)
          }
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
 * /battle/remove-from-battle:
 *   post:
 *     summary: Remove user from battle
 *     description: Remove user from battle in db
 *     tags:
 *       - battle
 *     security:
 *       - bearerAuth: []   # Indicates that the API requires a bearer token in the header
 *     parameters:
 *       - name: battle_id
 *         description: Battle Id
 *         in: query
 *         required: true
 *         type: string
 *       - name: user_id
 *         description: User Id
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Removed from Battle Successfully
 *       401:
 *         description: Error verifying access token
 *       500:
 *         description: Internal Server Error
 */

battleRouter.post("/remove-from-battle", async (req, res) => {
  const accessToken = req.headers.authorization;

  try {
    const decodedToken = await decodeAccessToken(accessToken);

    try{
      const db = admin.firestore();

      const battleId = req.query.battle_id;
      const userIdQuery = req.query.user_id;

      if (!battleId) {
        return res.status(400).send('Battle Id Required');
      }

      if (!userIdQuery) {
        return res.status(400).send('User Id Required');
      }

      // Check if doc for battleID exists
      const battleDocRef = db.collection('battles').doc(battleId)
      const battleDocRes = await battleDocRef.get();
      if(battleDocRes.exists) {
        const battleData = battleDocRes.data();
        if(battleData?.activeUsers.includes(userIdQuery)){
          if(decodedToken.user_id === userIdQuery || decodedToken.user_id === battleData?.activeUsers[0]){
            const newActiveUsersList = battleData?.activeUsers.filter((battleUserId)=>{
              return userIdQuery !== battleUserId
            })
            await battleDocRef.update({activeUsers:newActiveUsersList})
            return res.status(200).send({message: 'Removed Successfully'})
          }else{
            return res.status(404).send({ error: 'Not Authorized to remove'})
          }
        }else{
          return res.status(404).send({ error: 'Not a participant'})
        }
      } else {
        return res.status(404).send({ error: 'Battle not found'})
      }
    }catch(error){
      console.error('Error getting battle data:', error)
      return res.status(500).send({ error: 'Internal Server Error'})
    }
  } catch (error) {
    console.error('Error verifying access token:', error)
    return res.status(401).send({ error: 'Unauthorized'})
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
 * /battle/get-user-submissions:
 *   get:
 *     summary: Submissions by user in battle
 *     description: Returns details of all submissions done by the use in this battleId
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
 *         description: All battle submissions data
 *       500:
 *         description: Internal Server Error
 */

battleRouter.get("/get-user-submissions", async (req, res) => {
  const accessToken = req.headers.authorization;

  try {
    const decodedToken = await decodeAccessToken(accessToken);
    const battleId = req.query.battle_id;

    if (!battleId) {
      return res.status(400).send('Battle Id Required');
    }

    try {
      const db = admin.firestore();
      const submissionsRef = db.collection('submissions')
      const allSubmissionsSnapshot = (await submissionsRef.where('battleId','==',battleId).where('userId','==',decodedToken?.user_id).get()).docs
      let allSubmissionsData = allSubmissionsSnapshot.filter((submission)=>{
        const submissionData = submission.data()
        return (submissionData?.status && submissionData?.score)
      })
      allSubmissionsData = allSubmissionsData.map((submission)=>{
        const submissionData = submission.data()
        return {
          submissionId:submission.id,
          ...submissionData
        }
      })
      return res.status(200).json(allSubmissionsData)
    } catch (error) {
      console.error('Error getting submission/battle data:', error)
      return res.status(500).send({ error: 'Internal Server Error'})
    }
  } catch (error) {
    console.error('Error verifying access token:', error)
    return res.status(401).send({ error: 'Unauthorized'})
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