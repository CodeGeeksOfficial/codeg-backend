const client = require("../config/redis")

const getKey = async (key) => {
  return await client.get(key);
}

const setKey = async (key, value) => {
  return await client.set(key, value);
}

const delKey = async (key) => {
  return await client.del(key);
}

module.exports = { getKey, setKey, delKey }