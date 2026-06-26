const Database = require("better-sqlite3");
const path = require("path");
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "database.sqlite");
module.exports = new Database(dbPath);
