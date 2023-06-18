// Returns new leader board (player data in battle doc) after updating single player's rank and score
const updateScoreAndRank = async (battlePlayersData,userId,scoreIncrement) => {

  battlePlayersData[userId].score = battlePlayersData[userId].score + scoreIncrement
  
  const userObjectReference = battlePlayersData.userId;
  // Convert the object to an array of key-value pairs
  let entries = Object.entries(battlePlayersData);

  // Sort the array based on the "score" value
  entries.sort((a, b) => {
    // Get the score values
    const scoreA = a[1].score;
    const scoreB = b[1].score;

    if (scoreA !== scoreB) {
      // Sort based on the "score" value in descending order
      return scoreB - scoreA;
    } else {
      // Keep the known object at last
      if (a[1] === userObjectReference) return 1;
      if (b[1] === userObjectReference) return -1;
      return 0;
    }
  })

  let rankAllocator = 1
  entries = entries.map((player)=>{
    if(Number(player[1].score) !== 0){
      return [player[0],{...player[1],rank:rankAllocator++}]
    }else{
      return player
    }
  })
  // Convert the sorted array back to an object of objects
  const newBattlePlayersLeaderboard = Object.fromEntries(entries);
  // console.log(newBattlePlayersLeaderboard)
  
  return newBattlePlayersLeaderboard
}

module.exports = updateScoreAndRank