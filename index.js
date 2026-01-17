// index.js
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const pool = require("./db");
require("dotenv").config();

/* ===============================
   1. DATABASE INITIALIZATION
================================ */
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY,
        student_name TEXT,
        father_name TEXT
      );

      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id TEXT REFERENCES students(student_id),
        course_name TEXT,
        quiz NUMERIC DEFAULT 0,
        project NUMERIC DEFAULT 0,
        mid_exam NUMERIC DEFAULT 0,
        final_exam NUMERIC DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        student_id TEXT,
        course_name TEXT,
        complaint TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database structure verified.");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
};
initDb();

/* ===============================
   2. EXPRESS APP SETUP
================================ */
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health check for Render
app.get("/", (req, res) => res.send("Bot is running..."));

/* ===============================
   3. TELEGRAM BOT (WEBHOOK MODE)
================================ */
if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN is missing");
}

const bot = new TelegramBot(process.env.BOT_TOKEN);

// Webhook setup
const WEBHOOK_URL = `https://${process.env.RENDER_SERVICE_NAME}.onrender.com/bot${process.env.BOT_TOKEN}`;

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

(async () => {
  try {
    await bot.deleteWebHook();
    await bot.setWebHook(WEBHOOK_URL);
    console.log("✅ Telegram webhook set successfully");
  } catch (err) {
    console.error("❌ Webhook setup failed:", err.message);
  }
})();

/* ===============================
   4. BOT LOGIC
================================ */
const userState = {};

// START COMMAND
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: "STUDENT_ID" };

  bot.sendMessage(chatId, "👋 Welcome! Enter your *Student ID*:", {
    parse_mode: "Markdown",
  });
});

// MESSAGE HANDLER
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userState[chatId] || text.startsWith("/")) return;

  const state = userState[chatId];

  try {
    // STEP 1: STUDENT ID
    if (state.step === "STUDENT_ID") {
      state.studentId = text.trim();
      state.step = "FATHER_NAME";
      return bot.sendMessage(chatId, "👨 Enter your *Father Name*:", {
        parse_mode: "Markdown",
      });
    }

    // STEP 2: FATHER NAME
    if (state.step === "FATHER_NAME") {
      const result = await pool.query(
        `
        SELECT s.student_name, g.*
        FROM students s
        JOIN grades g ON s.student_id = g.student_id
        WHERE s.student_id = $1
        AND LOWER(s.father_name) = LOWER($2)
        `,
        [state.studentId, text.trim()]
      );

      if (result.rows.length === 0) {
        delete userState[chatId];
        return bot.sendMessage(
          chatId,
          "❌ Student not found. Check your ID and father name."
        );
      }

      const row = result.rows[0];

      // DEBUG LOG: confirm data
      console.log("DEBUG STUDENT ROW:", row);

      const total =
        Number(row.quiz) +
        Number(row.project) +
        Number(row.mid_exam) +
        Number(row.final_exam);

      // Letter grade
      let letterGrade = "F";
      if (total >= 90) letterGrade = "A+";
      else if (total >= 85) letterGrade = "A";
      else if (total >= 80) letterGrade = "A-";
      else if (total >= 75) letterGrade = "B+";
      else if (total >= 70) letterGrade = "B";
      else if (total >= 65) letterGrade = "B-";
      else if (total >= 60) letterGrade = "C+";
      else if (total >= 50) letterGrade = "C";
      else if (total >= 45) letterGrade = "C-";
      else if (total >= 40) letterGrade = "D";

      // Grade message
      let gradeMessage = "✋ Fail";
      if (total > 85) gradeMessage = "👏 Excellent";
      else if (total > 80) gradeMessage = "👍 Very Good";
      else if (total > 70) gradeMessage = "👌 Good";
      else if (total > 50) gradeMessage = "✌️ Satisfactory";
      else if (total >= 40) gradeMessage = "🤚 Unsatisfactory";

      const response = `
📄 *Student Grade Report*

👤 Name: ${row.student_name}
🆔 ID: ${state.studentId}
📘 Course: ${row.course_name}

━━━━━━━━━━━━━━━
📊 *Scores*
Quiz: ${row.quiz}
Project: ${row.project}
Mid Exam: ${row.mid_exam}
Final Exam: ${row.final_exam}

━━━━━━━━━━━━━━━
✅ Total: ${total}/100
🏆 Grade: *${letterGrade}*
${gradeMessage}
`;

      await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });

      // STEP 3: complaint
      state.step = "COMPLAINT";
      return bot.sendMessage(
        chatId,
        "📌 Write complaint or type /skip to finish."
      );
    }

    // STEP 3: COMPLAINT
    if (state.step === "COMPLAINT") {
      if (text.toLowerCase() === "/skip") {
        delete userState[chatId];
        return bot.sendMessage(chatId, "✅ Thank you! No complaint submitted.");
      }

      await pool.query(
        "INSERT INTO complaints(student_id, complaint) VALUES ($1, $2)",
        [state.studentId, text]
      );

      delete userState[chatId];
      return bot.sendMessage(chatId, "✅ Complaint submitted successfully.");
    }
  } catch (err) {
    console.error("BOT ERROR:", err);
    delete userState[chatId];
    bot.sendMessage(chatId, "⚠️ Server error. Try again later.");
  }
});

/* ===============================
   5. START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
