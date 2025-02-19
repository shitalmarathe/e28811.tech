const express = require("express");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

  const app = express();
  app.set("view engine", "ejs");
  app.use(express.static("public"));
  app.use(express.urlencoded({ extended: false })); // Parse form data

  app.get("/", (req, res) => {
  res.render("homepage");
});

// User Registration Starts
app.post("/register", (req, res) => {
  console.log(req.body);
  return res.send("Thanks for registering");
});
// User Registration Ends

  app.get("/login", (req, res) => {
    res.render("login");
  });


  app.post("/login", (req, res) => {
    res.send("Thanks, you're now logged in!");
  });


app.listen(PORT, () => {
  console.log(`Server fired up 🔥 on PORT: ${PORT}`);
});