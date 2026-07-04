const express = require("express");
const cors = require("cors");

const app = express();


app.use(cors());


app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    message: "Welcome to EthioMeds Finder API",
  });
});


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EthioMeds Finder API is running",
  });
});


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;