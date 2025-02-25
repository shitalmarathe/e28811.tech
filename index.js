console.clear();
require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

const db = require("better-sqlite3")("database.db");
db.pragma("journal_mode = WAL");

const PORT = process.env.PORT || 3000; // Getting port number from .env

// Database Setup
const createTables = db.transaction(() => {
  // Create users table
  // 1. write a sql statement db.prepare
  // 2. to run it .run()
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username STRING NOT NULL UNIQUE,
      password STRING NOT NULL
    )
    `
  ).run();
});
createTables();

const app = express();
app.set("view engine", "ejs"); // Setting ejs as our template engine
app.use(cookieParser());

// MARK: Middlewares
app.use(express.static("public")); // Using public as our static
app.use(express.urlencoded({ extended: false })); // Parse form data

app.use(function (req, res, next) {
  res.locals.errors = []; // Setting empty errors for all templates

  // Try to decode incoming cookie
  try {
    const decoded = jwt.verify(req.cookies.user, process.env.JWTSECRET);
    req.user = decoded.userId;
  } catch (err) {
    console.log("There is either no cookie, or malformed");
    req.user = false;
  }

  // req.locals.user = req.user; // Access from templates!

  console.log(req.user);

  next();
});

const users = {};

// MARK: Routes
app.get("/", (req, res) => {
  res.render("homepage");
});

// User Registration Starts
app.post("/register", (req, res) => {
  let { username, password } = req.body;
  const errors = [];

  username = username.trim();

  if (typeof username !== "string") username = "";
  if (typeof password !== "string") password = "";

  // Username Validation
  if (!username) {
    errors.push("Username is required");
  }
  if (username && username.length < 4) {
    errors.push("Username must contain atleast 4 characters");
  }
  if (username && username.length > 12) {
    errors.push("Username must not exceed 12 characters");
  }
  if (username && !username.match(/^[a-zA-Z0-9]+$/)) {
    errors.push("Username can't contain special characters");
  }
  // TODO: Check if user already exists in db
  if (users[username]) {
    errors.push("User already exists");
  }

  // Password Validation
  if (!password) {
    errors.push("Password is required");
  }
  if (password && password.length < 6) {
    errors.push("Password must contain atleast 6 characters");
  }
  if (password && password.length > 20) {
    errors.push("Password must not exceed 20 characters");
  }

  if (errors.length) {
    return res.render("homepage", { errors });
  }

  // Add the user to our database
  const salt = bcrypt.genSaltSync(10);
  password = bcrypt.hashSync(password, salt);

  const statement = db.prepare(
    `INSERT INTO users (username, password) VALUES (?, ?)`
  );
  const result = statement.run(username, password);

  const lookUp = db.prepare(`SELECT * FROM USERS WHERE ROWID = ?`);
  const ourUser = lookUp.get(result.lastInsertRowid);

  const ourTokenValue = jwt.sign(
    { userId: ourUser.id, exp: Date.now() / 1000 + 60 * 60 * 24 * 7 },
    process.env.JWTSECRET
  );

  // Send back a cookie to the user
  res.cookie("user", ourTokenValue, {
    httpOnly: true, // Not for client side JS
    secure: true, // Only for https
    sameSite: "strict", // CSRF Attacks but allows for subdomain
    maxAge: 1000 * 60 * 60 * 24 * 7, // milliseconds, our cookie is good for a week
  });

  return res.send(`Thank you for registration ${username}`);
});
// User Registration Ends

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let { username, password } = req.body;
  const errors = [];

  username = username.trim();

  if (typeof username !== "string") username = "";
  if (typeof password !== "string") password = "";

  // Check for empty values
  if (!username || !password) {
    errors.push("Please provide proper username & password");
  }

  // TODO: If not exists
  if (!users[username]) {
    errors.push("User does not exist");
  }

  // Check for password
  if (users[username] !== password) {
    errors.push("Invalid username / password");
  }

  if (errors.length > 0) {
    return res.render("login", { errors });
  }

  return res.send(`Thanks, you're now logged in! ${username}`);
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server fired up 🔥 on PORT: ${PORT}`);
});