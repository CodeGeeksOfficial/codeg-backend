import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import codeRouter from './routes/codeRouter'
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './config/swagger'
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();
const swaggerSpecs = swaggerJsdoc(swaggerOptions);
const app: Application = express();
const PORT = process.env.PORT || 7000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// app.get('/', (req: Request, res: Response, next: NextFunction) => {
//     res.send('Hello World');
// });
app.use("/code", codeRouter);
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
});