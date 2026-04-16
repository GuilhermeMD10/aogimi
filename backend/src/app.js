const express = require("express");
const wordsRouter     = require("./routes/words");
const kanjiRouter     = require("./routes/kanji");
const namesRouter     = require("./routes/names");
const searchRouter    = require("./routes/search");
const translateRouter = require("./routes/translate");

const app = express();

app.use(express.json());

// Allow the Next.js dev server (port 3001) to call the API (port 3000).
// POST is required by /api/translate; GET covers the rest of the endpoints.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "http://localhost:3001");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept,Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/search",    searchRouter);
app.use("/api/words",     wordsRouter);
app.use("/api/kanji",     kanjiRouter);
app.use("/api/names",     namesRouter);
app.use("/api/translate", translateRouter);

module.exports = app;
