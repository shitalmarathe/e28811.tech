const express = require("express");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const app = express();
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("homepage", { name: "Codespace" });
});

app.get("/about", (req, res) => {
    res.render("homepage", { name: "About us" });
  });

app.listen(PORT, () => {
  console.log(`Server fired up 🔥 on PORT: ${PORT}`);
});