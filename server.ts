import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("family_quest.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    level INTEGER,
    xp INTEGER,
    hearts INTEGER,
    streak INTEGER,
    debt INTEGER,
    monthlyDebt INTEGER DEFAULT 0,
    avatar TEXT,
    progress INTEGER,
    birthday TEXT,
    personalDuties TEXT DEFAULT '[]',
    paymentInfo TEXT,
    availability TEXT,
    settings TEXT,
    isOnline INTEGER DEFAULT 0,
    lastSeen TEXT
  );

  CREATE TABLE IF NOT EXISTS family_goals (
    id TEXT PRIMARY KEY,
    title TEXT,
    targetValue INTEGER,
    currentValue INTEGER DEFAULT 0,
    type TEXT,
    period TEXT,
    deadline TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    xp INTEGER,
    fine INTEGER,
    value INTEGER,
    status TEXT,
    icon TEXT,
    category TEXT,
    taskType TEXT,
    dueDate TEXT,
    assignedTo TEXT,
    imageUrl TEXT,
    completedAt TEXT,
    isVotingActive INTEGER DEFAULT 0,
    votes TEXT,
    penaltyMultiplier INTEGER DEFAULT 1,
    passCost INTEGER
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT,
    type TEXT,
    date TEXT,
    createdBy TEXT,
    recipients TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    userAvatar TEXT,
    text TEXT,
    imageUrl TEXT,
    timestamp TEXT,
    isAdminAlert INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    action TEXT,
    details TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS task_requests (
    id TEXT PRIMARY KEY,
    userId TEXT,
    taskId TEXT,
    day TEXT,
    slot TEXT,
    status TEXT DEFAULT 'pending',
    timestamp TEXT
  );
`);

// Migrations
try {
  db.exec("ALTER TABLE members ADD COLUMN monthlyDebt INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN isVotingActive INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN votes TEXT DEFAULT '[]'");
} catch (e) {}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN penaltyMultiplier INTEGER DEFAULT 1");
} catch (e) {}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN passCost INTEGER DEFAULT 5000");
} catch (e) {}

try {
  db.exec("ALTER TABLE messages ADD COLUMN isAdminAlert INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE members ADD COLUMN isOnline INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE members ADD COLUMN lastSeen TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE members ADD COLUMN birthday TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE members ADD COLUMN personalDuties TEXT DEFAULT '[]'");
} catch (e) {}

// Reset league stats if requested or on first run to ensure everyone is at zero
// The user explicitly asked for everyone to be at zero.
db.prepare("UPDATE members SET xp = 0, level = 1, streak = 0, hearts = 5, progress = 0").run();

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Broadcast to all clients
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on('connection', (ws) => {
    let currentUserId: string | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'IDENTIFY') {
          currentUserId = data.userId;
          db.prepare("UPDATE members SET isOnline = 1, lastSeen = ? WHERE id = ?").run(new Date().toISOString(), currentUserId);
          broadcast({ type: 'USER_ONLINE', userId: currentUserId });
        }
      } catch (e) {
        console.error("WS Message error", e);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        db.prepare("UPDATE members SET isOnline = 0, lastSeen = ? WHERE id = ?").run(new Date().toISOString(), currentUserId);
        broadcast({ type: 'USER_OFFLINE', userId: currentUserId });
      }
    });
  });

  // API Routes
  app.get("/api/state", (req, res) => {
    const members = db.prepare("SELECT * FROM members").all().map((m: any) => ({
      ...m,
      paymentInfo: JSON.parse(m.paymentInfo || '{}'),
      availability: JSON.parse(m.availability || '{}'),
      settings: JSON.parse(m.settings || '{}'),
      personalDuties: JSON.parse(m.personalDuties || '[]'),
      isOnline: !!m.isOnline
    }));
    const tasks = db.prepare("SELECT * FROM tasks").all().map((t: any) => ({
      ...t,
      isVotingActive: !!t.isVotingActive,
      votes: JSON.parse(t.votes || '[]')
    }));
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY date DESC").all().map((a: any) => ({
      ...a,
      recipients: JSON.parse(a.recipients || '[]')
    }));
    const messages = db.prepare("SELECT * FROM messages ORDER BY timestamp ASC").all().map((m: any) => ({
      ...m,
      isAdminAlert: !!m.isAdminAlert
    }));
    const familyGoals = db.prepare("SELECT * FROM family_goals").all();

    res.json({ members, tasks, alerts, messages, familyGoals });
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const member = db.prepare("SELECT * FROM members WHERE email = ? AND password = ?").get(email, password) as any;
    if (member) {
      db.prepare("UPDATE members SET isOnline = 1, lastSeen = ? WHERE id = ?").run(new Date().toISOString(), member.id);
      broadcast({ type: 'USER_ONLINE', userId: member.id });
      res.json({ 
        ...member, 
        paymentInfo: JSON.parse(member.paymentInfo || '{}'),
        availability: JSON.parse(member.availability || '{}'),
        settings: JSON.parse(member.settings || '{}'),
        personalDuties: JSON.parse(member.personalDuties || '[]'),
        isOnline: true
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/logout", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE members SET isOnline = 0 WHERE id = ?").run(userId);
    broadcast({ type: 'USER_OFFLINE', userId });
    res.json({ success: true });
  });

  app.post("/api/tasks", (req, res) => {
    const task = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tasks (id, title, description, xp, fine, value, status, icon, category, taskType, dueDate, assignedTo, imageUrl, completedAt, isVotingActive, votes, penaltyMultiplier, passCost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id, task.title, task.description, task.xp, task.fine, task.value, task.status, task.icon, task.category, task.taskType, task.dueDate, task.assignedTo, task.imageUrl, task.completedAt, task.isVotingActive ? 1 : 0, JSON.stringify(task.votes || []), task.penaltyMultiplier || 1, task.passCost
    );
    broadcast({ type: 'TASK_UPDATED', task });
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    broadcast({ type: 'TASK_DELETED', taskId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/members", (req, res) => {
    const member = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO members (id, name, email, password, role, level, xp, hearts, streak, debt, monthlyDebt, avatar, progress, birthday, personalDuties, paymentInfo, availability, settings, isOnline, lastSeen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      member.id, member.name, member.email, member.password, member.role, member.level, member.xp, member.hearts, member.streak, member.debt, member.monthlyDebt || 0, member.avatar, member.progress, member.birthday, JSON.stringify(member.personalDuties || []), JSON.stringify(member.paymentInfo || {}), JSON.stringify(member.availability || {}), JSON.stringify(member.settings || {}), member.isOnline ? 1 : 0, member.lastSeen
    );
    broadcast({ type: 'MEMBER_UPDATED', member });
    res.json({ success: true });
  });

  app.post("/api/family-goals", (req, res) => {
    const goal = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO family_goals (id, title, targetValue, currentValue, type, period, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(goal.id, goal.title, goal.targetValue, goal.currentValue || 0, goal.type, goal.period, goal.deadline);
    broadcast({ type: 'GOAL_UPDATED', goal });
    res.json({ success: true });
  });

  app.delete("/api/family-goals/:id", (req, res) => {
    db.prepare("DELETE FROM family_goals WHERE id = ?").run(req.params.id);
    broadcast({ type: 'GOAL_DELETED', goalId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/alerts", (req, res) => {
    const alert = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO alerts (id, title, message, type, date, createdBy, recipients)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(alert.id, alert.title, alert.message, alert.type, alert.date, alert.createdBy, JSON.stringify(alert.recipients || []));
    broadcast({ type: 'ALERT_ADDED', alert });
    res.json({ success: true });
  });

  app.post("/api/messages", (req, res) => {
    const msg = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages (id, userId, userName, userAvatar, text, imageUrl, timestamp, isAdminAlert)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(msg.id, msg.userId, msg.userName, msg.userAvatar, msg.text, msg.imageUrl, msg.timestamp, msg.isAdminAlert ? 1 : 0);
    broadcast({ type: 'MESSAGE_ADDED', message: msg });
    res.json({ success: true });
  });

  app.delete("/api/members/:id", (req, res) => {
    db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
    broadcast({ type: 'MEMBER_DELETED', userId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/logs", (req, res) => {
    const log = req.body;
    const stmt = db.prepare(`
      INSERT INTO logs (id, userId, userName, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const logId = log.id || Math.random().toString(36).substring(7);
    const timestamp = log.timestamp || new Date().toISOString();
    stmt.run(logId, log.userId, log.userName, log.action, log.details, timestamp);
    broadcast({ type: 'LOG_ADDED', log: { ...log, id: logId, timestamp } });
    res.json({ success: true });
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.get("/api/task-requests", (req, res) => {
    const requests = db.prepare("SELECT * FROM task_requests").all();
    res.json(requests);
  });

  app.post("/api/task-requests", (req, res) => {
    const request = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO task_requests (id, userId, taskId, day, slot, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      request.id || Math.random().toString(36).substring(7),
      request.userId,
      request.taskId,
      request.day,
      request.slot,
      request.status || 'pending',
      request.timestamp || new Date().toISOString()
    );
    broadcast({ type: 'TASK_REQUEST_UPDATED', request });
    res.json({ success: true });
  });

  app.delete("/api/task-requests/:id", (req, res) => {
    db.prepare("DELETE FROM task_requests WHERE id = ?").run(req.params.id);
    broadcast({ type: 'TASK_REQUEST_DELETED', requestId: req.params.id });
    res.json({ success: true });
  });

  // Seed data if empty
  const memberCount = db.prepare("SELECT COUNT(*) as count FROM members").get() as any;
  if (memberCount.count === 0) {
    const { MEMBERS, INITIAL_TASKS } = await import("./src/constants.js");
    MEMBERS.forEach((m: any) => {
      db.prepare(`
        INSERT INTO members (id, name, email, password, role, level, xp, hearts, streak, debt, monthlyDebt, avatar, progress, paymentInfo, availability, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(m.id, m.name, m.email, m.password, m.role, m.level, m.xp, m.hearts, m.streak, m.debt, 0, m.avatar, m.progress, JSON.stringify(m.paymentInfo || {}), JSON.stringify(m.availability || {}), JSON.stringify(m.settings || {}));
    });
    INITIAL_TASKS.forEach((t: any) => {
      db.prepare(`
        INSERT INTO tasks (id, title, description, xp, fine, value, status, icon, category, taskType, dueDate, assignedTo, imageUrl, completedAt, isVotingActive, votes, penaltyMultiplier, passCost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(t.id, t.title, t.description, t.xp, t.fine, t.value, t.status, t.icon, t.category, t.taskType, t.dueDate, t.assignedTo, t.imageUrl, t.completedAt, 0, '[]', 1, 5000);
    });
  }

  // Cleanup old data (older than 30 days)
  const cleanup = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoDate = thirtyDaysAgo.toISOString();

    db.prepare("DELETE FROM tasks WHERE completedAt < ? AND status IN ('validated', 'failed')").run(isoDate);
    db.prepare("DELETE FROM logs WHERE timestamp < ?").run(isoDate);
    db.prepare("DELETE FROM messages WHERE timestamp < ?").run(isoDate);
    db.prepare("DELETE FROM task_requests WHERE timestamp < ? AND status != 'pending'").run(isoDate);
    db.prepare("DELETE FROM alerts WHERE date < ?").run(isoDate);
    console.log("Cleanup completed: Removed data older than 30 days");
  };

  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000); // Run daily

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
