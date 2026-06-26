const db = require("./db");
db.exec(`
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('ACTIVE','INACTIVE')), created_at TEXT NOT NULL);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL CHECK(status IN ('PAID','PENDING','CANCELLED')), created_at TEXT NOT NULL);
`);
const c = db.prepare("INSERT INTO customers VALUES (?, ?, ?, ?)");
const o = db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?)");
c.run(1001,"John Smith","ACTIVE","2026-06-01");
c.run(1002,"Priya Kumar","ACTIVE","2026-06-02");
c.run(1003,"Maria Garcia","INACTIVE","2026-06-03");
o.run(501,1001,250.00,"PAID","2026-06-05");
o.run(502,1001,125.50,"PAID","2026-06-06");
o.run(503,1002,399.99,"PAID","2026-06-07");
o.run(504,1002,80.00,"PENDING","2026-06-07");
o.run(505,1003,50.00,"CANCELLED","2026-06-08");
console.log("SQLite database initialized.");
