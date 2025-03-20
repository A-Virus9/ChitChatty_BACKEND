const express = require("express");
const morgan = require("morgan");

const userRouter = require("./routers/userRouter.js");
const chatRouter = require("./routers/chatRouter.js");
const createError = require("./utils/createError");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.static("public"));

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

app.use(helmet());

app.use(morgan("dev"));

app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: ["duration", "rating"],
  })
);

app.use(cookieParser());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use("/users", userRouter);
app.use("/chats", chatRouter);

app.all("*", (req, res, next) => {
  return next(createError(`Cant find ${req.originalUrl} on this server`, 404));
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (err.code === 11000) err.message = "Dublicate entry";
  if (err.name === "ValidationError") err.message = `Data not valid: ${err}`;
  if (err.name === "JsonWebTokenError") err.message = "Invalid JWT token";
  if (err.name === "TokenExpiredError") err.message = "JWT token expired";

  res.status(err.statusCode).json({
    status: err.status,
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
});

module.exports = app;
