const isBattleCompleted = (startedAtTimeStamp, timeValidity) => {
  if (!startedAtTimeStamp) {
    return false;
  }

  const startedAt = startedAtTimeStamp.toDate();
  const currentTimestamp = new Date();
  const validTillTimestamp = new Date(startedAt.getTime() + (timeValidity * 60000));

  if (validTillTimestamp < currentTimestamp) {
    return true;
  } else {
    return false;
  }
}

module.exports = isBattleCompleted;