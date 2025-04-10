import {Database} from "bun:sqlite";
 const db = new Database("db.sqlite");
 
 db.exec("PRAGMA journal_mode = WAL;");
 
 // Database Setup
 const createTables = db.transaction(() => {
  
   // 1. write a sql statement db.prepare
   // 2. to run it .run()

    // Create users table
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
         image BLOB,
         authorid INTEGER,
         FOREIGN KEY (authorid) REFERENCES users (id)
       )
     `
   ).run();


   db.prepare(
    `
    CREATE TABLE IF NOT EXISTS comments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      createdDate TEXT,
      authorid INTEGER NOT NULL,
      paperid INTEGER NOT NULL,
      FOREIGN KEY (authorid) REFERENCES users (id),
      FOREIGN KEY (paperid) REFERENCES papers (id)
    )
    `
  ).run();
 });

 createTables();
 
 export { db };