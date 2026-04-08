const express = require("express");
const wordsRouter = require("./routes/words");
const kanjiRouter = require("./routes/kanji");
const namesRouter = require("./routes/names");

const app = express();

app.use(express.json());

app.use("/api/words", wordsRouter);
app.use("/api/kanji", kanjiRouter);
app.use("/api/names", namesRouter);

module.exports = app;
