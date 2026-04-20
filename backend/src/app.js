const express = require("express");
const wordsRouter     = require("./routes/words");
const kanjiRouter     = require("./routes/kanji");
const namesRouter     = require("./routes/names");
const searchRouter    = require("./routes/search");
const translateRouter = require("./routes/translate");
const userRouter      = require("./routes/user");
const booksRouter     = require("./routes/books");
const decksRouter     = require("./routes/decks");
const devicesRouter   = require("./routes/devices");

const app = express();

app.use(express.json());

// Allow the Next.js dev server to call the API.
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:3001,http://localhost:3002").split(",")
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept,Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/search",    searchRouter);
app.use("/api/words",     wordsRouter);
app.use("/api/kanji",     kanjiRouter);
app.use("/api/names",     namesRouter);
app.use("/api/translate", translateRouter);
app.use("/api/user",      userRouter);
app.use("/api/books",     booksRouter);
app.use("/api/decks",     decksRouter);
app.use("/api/devices",   devicesRouter);

module.exports = app;
