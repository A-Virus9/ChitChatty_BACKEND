process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("Uncaught Exception! Shutting down...");
  process.exit(1);
});

const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const server = http.createServer(app);
const setupSocket = require("./socket");
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const port = process.env.PORT || 3000;

app.use(express.static("/public"));

app.get("/", (req, res) => {
  res.sendFile("/public/index.html");
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

(function startConnect() {
  mongoose
    .connect(DB)
    .then((con) => {
      console.log("DB successful");
      setupSocket(io);
    })
    .catch((err) => {
      console.error(err, "Couldn't connect DB");
      startConnect();
    });
})();

server.listen(port, () => {
  console.log(`App running on ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message, err.stack);
  console.log("Unhandled rejection! Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
