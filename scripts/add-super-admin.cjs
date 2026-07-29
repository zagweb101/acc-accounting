const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "acc.db");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get("accsbc@hotmail.com");
if (existing) {
  console.log("Super admin already exists with id:", existing.id);
  process.exit(0);
}

const userId = generateId();
const insertUser = db.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)");
insertUser.run(userId, "Super Admin", "accsbc@hotmail.com", hashPassword("Ym@0569040870"), "owner");

const actIds = db.prepare("SELECT id FROM activities").all();
const insertUA = db.prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");
for (const a of actIds) insertUA.run(userId, a.id);

console.log("Super admin created with id:", userId);
