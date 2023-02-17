const express = require("express")
const userRouter = express.Router()
const client = require("../config/dbconfig");

// *** Get all users ***
userRouter.get("/all_users", async (req, res) => {
  const result = await client.query('SELECT * FROM users');
  const users = result.rows;
  return res.status(200).send({ users })
});

// *** Create a new user, //TODO: vipul: add error handling for duplicate user ***
userRouter.post("/create_user", async (req, res) => {
  let data = {
    email: req.body.email,
    name: req.body.name
  }

  if (!data.email) {
    return res.status(400).send({ error: "Email not specified" });
  }

  if (!data.name) {
    return res.status(400).send({ error: "Name not specified" });
  }

  const result = await client.query(`
  INSERT INTO users (name, email)
  VALUES ('${data.name}', '${data.email}');
  `);
  return res.send("User Created !");
})

module.exports = userRouter