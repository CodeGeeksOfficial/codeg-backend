// App config imports
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

// Routers Imports
const codeRouter = require('./routes/codeRouter')
const userRouter = require('./routes/userRouter')
const questionRouter = require('./routes/questionRouter');

// Swagger Imports
const swaggerUi = require('swagger-ui-express')
const swaggerOptions = require('./config/swagger')
const swaggerJsdoc = require('swagger-jsdoc')

// Firebase imports
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.config.json');

// Initialize Firebase App
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Configure app
dotenv.config();
const swaggerSpecs = swaggerJsdoc(swaggerOptions);
const app = express();
const PORT = process.env.PORT || 7000;

// Middlewares (Don't change order randomly)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());


// Routers
app.use("/question", questionRouter);
app.use("/user", userRouter);
app.use("/code", codeRouter);
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Start Listening
app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
});