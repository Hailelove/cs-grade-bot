const express = require("express");

const TelegramBot = require("node-telegram-bot-api");
const pool = require("./db");
require("dotenv").config();

// --- 1. NEW: AUTO-DATABASE SETUP ---
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

      -- Add the test student automatically
      INSERT INTO students (student_id, student_name, father_name) VALUES
('MAU1600024', 'ABEL', 'SHEWANGZAW'), ('MAU1600056', 'ABYU', 'ESHETIE'),
('MAU1600090', 'AKILILU', 'AYKA'), ('MAU1600113', 'ALEMU', 'MEKETE'),
('MAU1600114', 'ALEMU', 'SEWNET'), ('MAU1600170', 'ASRESACH', 'ADUGNA'),
('MAU1600243', 'BELAYNEH', 'BEKELE'), ('MAU1600247', 'BELAYNESH', 'DIRESS'),
('MAU1600248', 'BELAYNESH', 'GETIE'), ('MAU1600269', 'BETELHEM', 'NIGATU'),
('MAU1602191', 'BEYENE', 'DEMEKE'), ('MAU1600359', 'BOSENA', 'SHUMET'),
('MAU1600375', 'DANIEL', 'ZIGABE'), ('MAU1602192', 'DIGIS', 'BIRHAN'),
('MAU1600478', 'ENATIHUN', 'YIMER'), ('MAU1600480', 'ENCHALEW', 'AZIMERAW'),
('MAU1600481', 'ENDALE', 'YIRGA'), ('MAU1600506', 'EYERUS', 'SHIBABAW'),
('MAU1600524', 'FASIKA', 'KIBURIE'), ('MAU1600525', 'FASIKA', 'SHEGAW'),
('MAU1600540', 'FETENECH', 'WORKU'), ('MAU1600545', 'FIKIRE', 'GIRMA'),
('MAU1600557', 'FTAMLAK', 'GETU'), ('MAU1600605', 'GETANEH', 'MARKIE'),
('MAU1600620', 'GIZACHEW', 'KASSA'), ('MAU1600683', 'HENOK', 'SFAT'),
('MAU1600704', 'HULUNAYEHU', 'ASHEBIR'), ('MAU1600756', 'KINDU', 'FIKAD'),
('MAU1600805', 'MANAYEH', 'BAYILE'), ('MAU1600822', 'MASTEWAL', 'MEHARIW'),
('MAU1600979', 'NADIYA', 'AZANAW'), ('MAU1600982', 'NAOL', 'ABEBE'),
('MAU1602196', 'SAMUEL', 'ALEMSW'), ('MAU1601098', 'SIMEGNAW', 'MUNYE'),
('MAU1601148', 'TEKEBA', 'AWEKE'), ('MAU1601187', 'TIGIST', 'ASEFA'),
('MAU1601206', 'TIHUN', 'WONDIE'), ('MAU1601217', 'TIRUNESH', 'GIRMAW'),
('MAU1601222', 'TSEGAYE', 'ADERAJEW'), ('MAU1601288', 'YABSIRA', 'DEMEKE'),
('MAU1601300', 'YEAMLAKSIRA', 'ADANE'), ('MAU1601333', 'YESUF', 'HAMID'),
('MAU1601342', 'YILKAL', 'DEMEKE'), ('MAU1601351', 'YOHANES', 'SETEGN');

      INSERT INTO grades (student_id, course_name, mid_exam, quiz, project, final_exam) VALUES
('MAU1600024', 'Computer Science', 22.5, 4, 19, 42), ('MAU1600056', 'Computer Science', 19.5, 3, 18, 27),
('MAU1600090', 'Computer Science', 21.5, 3.5, 18, 43.5), ('MAU1600113', 'Computer Science', 20, 4, 18, 31.5),
('MAU1600114', 'Computer Science', 20.5, 2, 18, 38), ('MAU1600170', 'Computer Science', 20, 3, 17, 34.5),
('MAU1600243', 'Computer Science', 21.5, 4, 18, 44.5), ('MAU1600247', 'Computer Science', 19.5, 3, 17, 36.5),
('MAU1600248', 'Computer Science', 19.5, 2.5, 17.5, 27), ('MAU1600269', 'Computer Science', 19, 3, 18.5, 22),
('MAU1602191', 'Computer Science', 23, 2, 19, 41.5), ('MAU1600359', 'Computer Science', 18.5, 3, 17.5, 36.5),
('MAU1600375', 'Computer Science', 17.5, 4, 18, 17.5), ('MAU1602192', 'Computer Science', 24, 3, 17.5, 33),
('MAU1600478', 'Computer Science', 20, 2.5, 17.5, 37), ('MAU1600480', 'Computer Science', 19, 4, 18.5, 42.5),
('MAU1600481', 'Computer Science', 14.5, 3, 18, 32), ('MAU1600506', 'Computer Science', 21.5, 2, 19, 44),
('MAU1600524', 'Computer Science', 18, 2.5, 18, 36), ('MAU1600525', 'Computer Science', 16, 2, 18, 35),
('MAU1600540', 'Computer Science', 15.5, 2, 19, 31), ('MAU1600545', 'Computer Science', 19.5, 4, 18, 30.5),
('MAU1600557', 'Computer Science', 19, 3.5, 17.5, 39.5), ('MAU1600605', 'Computer Science', 19.5, 3.5, 18.5, 35.5),
('MAU1600620', 'Computer Science', 22.5, 3, 18.5, 41), ('MAU1600683', 'Computer Science', 13.5, 2.5, 19, 35.5),
('MAU1600704', 'Computer Science', 22.5, 2.5, 18, 38.5), ('MAU1600756', 'Computer Science', 24, 4, 17, 36.5),
('MAU1600805', 'Computer Science', 17, 3.5, 18, 36.5), ('MAU1600822', 'Computer Science', 25, 3, 17, 23.5),
('MAU1600979', 'Computer Science', 23.5, 2.5, 18.5, 42), ('MAU1600982', 'Computer Science', 19.5, 4, 18, 43),
('MAU1602196', 'Computer Science', 23, 0, 17, 35), ('MAU1601098', 'Computer Science', 20, 2, 18, 33),
('MAU1601148', 'Computer Science', 21.5, 3.5, 18, 36), ('MAU1601187', 'Computer Science', 20, 2, 19, 37),
('MAU1601206', 'Computer Science', 18, 2.5, 18, 40), ('MAU1601217', 'Computer Science', 18.5, 2, 17.5, 33.5),
('MAU1601222', 'Computer Science', 24.5, 3, 18.5, 43), ('MAU1601288', 'Computer Science', 21, 2, 17, 42),
('MAU1601300', 'Computer Science', 20.5, 3, 17.5, 30.5), ('MAU1601333', 'Computer Science', 22, 4, 18, 39.5),
('MAU1601342', 'Computer Science', 16, 2, 18, 33), ('MAU1601351', 'Computer Science', 23.5, 0, 18.5, 37.5);
    `);
    console.log("✅ Database Tables & Test Data Ready!");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
};
initDb();
// -----------------------------------

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
