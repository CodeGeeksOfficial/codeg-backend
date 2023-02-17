const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv').config({ path: './config.env' });
const userRouter = require("./routes/userRoutes");
const homeRouter = require("./routes/homeRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

// *** App configurations ***
const app = express();
const PORT = process.env.PORT || 7000;

// *** Middlewares ***
// Position of these middlewares matters, so while adding another keep it in mind which one to keep first
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// *** Routers ***
app.use("/", homeRouter);
app.use("/user", userRouter);
app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// *** Start server listening on defined PORT *** 
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
