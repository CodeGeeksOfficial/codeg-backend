const admin = require('firebase-admin');

function decodeAccessToken(accessToken) {
  accessToken = accessToken.split(" ")[1];
  return admin.auth().verifyIdToken(accessToken);
}

module.exports = { decodeAccessToken }