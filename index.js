const express = require("express");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("homepage");
});

app.get("/login", (req, res) => {
    res.render("login");
  });

app.listen(PORT, () => {
  console.log(`Server fired up 🔥 on PORT: ${PORT}`);
});