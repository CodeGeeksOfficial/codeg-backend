const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const codeRouter = require('./routes/codeRouter')
const userRouter = require('./routes/userRouter')
const swaggerUi = require('swagger-ui-express')
const swaggerOptions = require('./config/swagger')
const swaggerJsdoc = require('swagger-jsdoc')
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.config.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

dotenv.config();
const swaggerSpecs = swaggerJsdoc(swaggerOptions);
const app = express();
const PORT = process.env.PORT || 7000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// app.get('/', (req: Request, res: Response, next: NextFunction) => {
//     res.send('Hello World');
// });
app.use("/user", userRouter);
app.use("/code", codeRouter);
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
});