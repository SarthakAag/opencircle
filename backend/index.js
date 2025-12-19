const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   DATA FILE SETUP
======================= */
const journalsPath = path.join(__dirname, "data", "journals.json");
const usersPath = path.join(__dirname, "data", "users.json");

// Ensure data files exist
[journalsPath, usersPath].forEach((file) => {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify([]));
  }
});

/* =======================
   AI SENTIMENT ANALYSIS
======================= */
function analyzeSentiment(text) {
  const negativeWords = [
    "stress",
    "stressed",
    "anxious",
    "sad",
    "angry",
    "tired",
    "worried",
    "depressed"
  ];

  const positiveWords = [
    "happy",
    "good",
    "relaxed",
    "calm",
    "excited",
    "positive",
    "grateful"
  ];

  let score = 0;
  const lowerText = text.toLowerCase();

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score--;
  });

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score++;
  });

  if (score > 0) return "Positive";
  if (score < 0) return "Negative";
  return "Neutral";
}

/* -----------------------
   AI CHATBOT (FREE)
----------------------- */
function chatbotReply(message) {
  const msg = message.toLowerCase();

  if (msg.includes("stress") || msg.includes("anxious")) {
    return "I’m really glad you shared that. Stress can feel overwhelming, but you’re not alone. Try taking a slow breath with me — in for 4 seconds, out for 6.";
  }

  if (msg.includes("sad") || msg.includes("down")) {
    return "I hear you. Feeling low can be really hard. It’s okay to take things one small step at a time.";
  }

  if (msg.includes("happy") || msg.includes("good")) {
    return "That’s nice to hear 😊 What do you think helped you feel this way today?";
  }

  return "Thank you for opening up. I’m here with you. You can tell me more if you’d like.";
}

app.post("/chat", (req, res) => {
  console.log("CHAT BODY:", req.body);

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const reply = chatbotReply(message);
  res.json({ reply });
});


/* =======================
   ROUTES
======================= */

// Health check
app.get("/", (req, res) => {
  res.send("Mental Health Backend running 🚀");
});

/* -----------------------
   USER AUTH (MVP)
----------------------- */
app.post("/login", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  let user = users.find((u) => u.email === email);

  if (!user) {
    user = {
      id: Date.now(),
      email
    };
    users.push(user);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  }

  res.json(user);
});

/* -----------------------
   JOURNALS (PRIVATE)
----------------------- */

// Get journals for a specific user only
app.get("/journals", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  const journals = JSON.parse(fs.readFileSync(journalsPath, "utf-8"));
  const userJournals = journals.filter((j) => j.userId == userId);

  res.json(userJournals);
});

// Add a new journal
app.post("/journals", (req, res) => {
  const { text, mood, userId } = req.body;

  if (!text || !userId) {
    return res.status(400).json({
      error: "Journal text and user ID are required"
    });
  }

  const sentiment = analyzeSentiment(text);
  const journals = JSON.parse(fs.readFileSync(journalsPath, "utf-8"));

  const newJournal = {
    id: Date.now(),
    userId,
    text,
    mood: mood || "neutral",
    sentiment,
    createdAt: new Date().toISOString()
  };

  journals.push(newJournal);
  fs.writeFileSync(journalsPath, JSON.stringify(journals, null, 2));

  res.status(201).json(newJournal);
});

/* -----------------------
   AI CHATBOT
----------------------- */
app.post("/chat", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const reply = chatbotReply(message);
  res.json({ reply });
});

/* =======================
   SERVER START
======================= */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});  