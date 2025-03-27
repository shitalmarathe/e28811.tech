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
         authorid INTEGER,
         FOREIGN KEY (authorid) REFERENCES users (id)
       )
     `
   ).run();
 });

 createTables();
 
 export { db };