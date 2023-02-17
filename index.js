const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const { Client } = require('pg');

// *** App configurations ***
dotenv.config({ path: './config.env' });
const app = express();
const PORT = 7000;

// *** Middlewares ***
// Position of these middlewares matters, so while adding another keep it in mind which one to keep first
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// *** DB Connection ***
const client = new Client({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER_DB,
  database: process.env.POSTGRES_USER_DB,
  password: process.env.POSTGRES_PASSWORD
});

client.connect().then(() => {
  console.log("DB Connected");
});


// *** Home endpoint ***
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// TODO: vipul: Setup a router, and redirect all user related requests to /api/user/<endpoint>
// *** Get all users ***
app.get("/all_users", async (req, res) => {
  const result = await client.query('SELECT * FROM users');
  const users = result.rows;
  return res.status(200).send({ users })
});

// *** Create a new user, //TODO: vipul: add error handling for duplicate user ***
app.post("/create_user", async (req, res) => {
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

// *** Start server listening on defined PORT *** 
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
