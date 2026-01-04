const express = require("express");

const TelegramBot = require("node-telegram-bot-api");
const pool = require("./db");
require("dotenv").config();

// --- ADD THIS PORT BINDING BLOCK ---
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
// ------------------------------------

if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN is missing");
}

// const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
});
// Add this line right after to clear any "hanging" updates
bot.on("polling_error", (error) => {
  if (error.code === "ETELEGRAM" && error.message.includes("409 Conflict")) {
    console.log("Waiting for old session to terminate...");
  } else {
    console.error("Polling Error:", error);
  }
});
const userState = {};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: "STUDENT_ID" };

  bot.sendMessage(
    chatId,
    "👋 Welcome to see your result via Telegram Bot\n\nPlease enter your *Student ID*:",
    { parse_mode: "Markdown" }
  );
});

// Handle messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userState[chatId] || text.startsWith("/")) return;

  const state = userState[chatId];

  try {
    // STEP 1: Student ID
    if (state.step === "STUDENT_ID") {
      state.studentId = text.trim();
      state.step = "FATHER_NAME";
      return bot.sendMessage(chatId, "👨 Please enter your *Father Name*:", {
        parse_mode: "Markdown",
      });
    }

    // STEP 2: Father Name
    if (state.step === "FATHER_NAME") {
      const studentId = state.studentId;
      const fatherName = text.trim();

      const result = await pool.query(
        `
        SELECT s.student_name, g.*
        FROM students s
        JOIN grades g ON s.student_id = g.student_id
        WHERE s.student_id = $1
        AND LOWER(s.father_name) = LOWER($2)
        `,
        [studentId, fatherName]
      );

      if (result.rows.length === 0) {
        delete userState[chatId];
        return bot.sendMessage(
          chatId,
          "```\n        ❌ Student not found.\nPlease check your ID and father name.\n```",
          { parse_mode: "Markdown" }
        );
      }

      const row = result.rows[0];

      // Calculate total
      const total =
        Number(row.quiz) +
        Number(row.project) +
        Number(row.mid_exam) +
        Number(row.final_exam);

      // Grade calculation
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
      else if (total <= 40) letterGrade = "F";

      // Grade message
      let gradeMessage = "🤚 Unsatisfactory";
      if (total > 85) gradeMessage = "👏 Excellent";
      else if (total > 80) gradeMessage = "👍 Very Good";
      else if (total > 70) gradeMessage = "👌 Good";
      else if (total > 50) gradeMessage = "✌️ Satisfactory";
      else if (total >= 40) gradeMessage = "🤚 Unsatisfactory";
      else gradeMessage = "✋ Fail";

      const response = `
📄 *Student Grade Report*

👤 Name       : ${row.student_name}
🆔 Student ID : ${studentId}
📘 Course     : ${row.course_name}

━━━━━━━━━━━━━━━
📊 *Scores:*
👉 Quiz: ${row.quiz}
👉 Project: ${row.project}
👉 Mid Exam: ${row.mid_exam}
👉 Final Exam: ${row.final_exam}

━━━━━━━━━━━━━━━
✅ Total mark: ${total}/100
🏆 *Your grade is:* ${letterGrade}
" " ${gradeMessage}
`;

      await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });

      // Ask for complaint
      state.step = "COMPLAINT";
      return bot.sendMessage(
        chatId,
        "📌 If you want to submit a complaint about your assessment, you can write here.\n Unless type /skip to finish."
      );
    }

    // STEP 3: Handle Complaint
    if (state.step === "COMPLAINT") {
      const complaintText = text.trim();

      if (complaintText.toLowerCase() === "/skip") {
        delete userState[chatId];
        return bot.sendMessage(chatId, "✅ Thank you! No complaint submitted.");
      }

      await pool.query(
        "INSERT INTO complaints(student_id, course_name, complaint) VALUES ($1, $2, $3)",
        [state.studentId, state.courseName || null, complaintText]
      );

      delete userState[chatId];
      return bot.sendMessage(
        chatId,
        "✅ Your complaint has been submitted. I will try to review it soon."
      );
    }
  } catch (err) {
    console.error("BOT ERROR 👉", err); // Changed from err.message to err
    bot.sendMessage(chatId, `⚠️ Server error: ${err.message}`);
    delete userState[chatId];
  }
});
