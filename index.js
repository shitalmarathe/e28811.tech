console.clear();
require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const sanitizeHtml = require("sanitize-html");

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

  db.prepare(
    `
      CREATE TABLE IF NOT EXISTS papers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdDate TEXT,
        title STRING NOT NULL,
        body STRING NOT NULL,
        authorid INTEGER,
        FOREIGN KEY (authorid) REFERENCES users (id)
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

app.use( (req, res, next) =>{
  res.locals.errors = []; // Setting empty errors for all templates

  // Try to decode incoming cookie
  try {
    const decoded = jwt.verify(req.cookies.user, process.env.JWTSECRET);
    req.user = decoded.userId;
  } catch (err) {
    console.log("There is either no cookie, or malformed");
    req.user = false;
  }

  res.locals.user = req.user; // Access from templates!

  console.log(req.user);

  next();
});

const users = {};

// MARK: Routes
app.get("/", (req, res) => {
  if (req.user) {
    return res.render("dashboard");
  }
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


  //  Check if user already exists in db
  const usernameExistsStatement = db.prepare(
    "SELECT * FROM users WHERE USERNAME = ?"
  );
  const usernameCheck = usernameExistsStatement.get(username);

  if (usernameCheck) {
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


  // Get newly created user db rowid
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
  res.redirect("/");
});


// User Registration Ends

app.get("/login", (req, res) => {
  res.render("login");
});

// Implement Login
app.post("/login", (req, res) => {
  let { username, password } = req.body;
  const errors = [];

  username = username.trim();

  if (typeof username !== "string") username = "";
  if (typeof password !== "string") password = "";

  // Check for empty values
  if (!username || !password) {
    errors.push("Invalid username / password");
  }

  if (errors.length) {
    return res.render("login", { errors });
  }

    // If username is not there in the database
    const userInDBStatement = db.prepare(
      `SELECT * FROM users WHERE USERNAME = ?`
    );
    const userInDB = userInDBStatement.get(username);
  
    if (!userInDB) {
    errors.push("User does not exist");
    return res.render("login", { errors });
  }

   // Check for password matching
   const passwordCheck = bcrypt.compareSync(password, userInDB.password);
   if (!passwordCheck) {
     errors.push("Password is incorrect");
  }

  if (errors.length > 0) {
    return res.render("login", { errors });
  }

 // Send back a cookie to the user
 const ourTokenValue = jwt.sign(
  { userId: userInDB.id, exp: Date.now() / 1000 + 60 * 60 * 24 * 7 },
  process.env.JWTSECRET
);

res.cookie("user", ourTokenValue, {
  httpOnly: true, // Not for client side JS
  secure: true, // Only for https
  sameSite: "strict", // CSRF Attacks but allows for subdomain
  maxAge: 1000 * 60 * 60 * 24 * 7, // milliseconds, our cookie is good for a week
});

// Redirect them to the home page
res.redirect("/");
});


// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/");
});

// Implement Post Functionality
function mustBeLoggedIn(req, res, next) {
  if (req.user) {
    return next();
  }

  return res.redirect("/");
}

// Common post request validation field
function postValidation(req) {
  const errors = [];

  if (typeof req.body.title !== "string") req.body.title = "";
  if (typeof req.body.body !== "string") req.body.body = "";



  // TODO: Do not allow or remove any html tags
  req.body.title = sanitizeHtml(req.body.title, {
    allowedTags: [],
    allowedAttributes: {},
  });
  req.body.body = sanitizeHtml(req.body.body, {
    allowedTags: ["a"],
    allowedAttributes: {
      a: ["href"],
    },
  });

  if (!req.body.title) errors.push("Title must not be empty");
  if (!req.body.body) errors.push("Body must not be empty");

  return errors;
}

app.get("/create-paper", mustBeLoggedIn, (req, res) => {
  res.render("create-paper");
});


// Read a paper route
app.get("/paper/:id", (req, res) => {
  // Read operation on db
  const statement = db.prepare(
    `SELECT papers.*, users.username FROM papers INNER JOIN users ON papers.authorid = users.id WHERE papers.id = ?`
  );
  const paper = statement.get(req.params.id);

  if (!paper) {
    return res.redirect("/");
  }

  return res.render("single-paper", { paper });
});



app.post("/create-paper", mustBeLoggedIn, (req, res) => {
  const errors = postValidation(req);

  if (errors.length) {
    console.log("inside errors");
    return res.render("create-paper", { errors });
  }



  // Save into database
  const statement = db.prepare(
    `INSERT INTO papers (title, body, authorid, createdDate) VALUES (?, ?, ?, ?)`
  );
  const result = statement.run(
    req.body.title,
    req.body.body,
    req.user,
    new Date().toISOString()
  );

 // Redirect user to newly created paper
 const getPostStatement = db.prepare(`SELECT * FROM papers WHERE ROWID = ?`);
 const realPost = getPostStatement.get(result.lastInsertRowid);

 return res.redirect(`/paper/${realPost.id}`);
});

app.listen(PORT, () => {
  console.log(`Server fired up 🔥 on PORT: ${PORT}`);
});