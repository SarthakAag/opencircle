"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  sender: "user" | "bot";
  text: string;
};

export default function Home() {
  const [journals, setJournals] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("neutral");

  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);

  // Chatbot
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // 🎤 Voice wellbeing (Web Speech API)
  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);

  /* =======================
     LOAD USER FROM STORAGE
  ======================= */
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  /* =======================
     FETCH USER JOURNALS
  ======================= */
  const fetchJournals = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(
        `http://localhost:5000/journals?userId=${user.id}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setJournals(data);
    } catch (err) {
      console.error("Failed to fetch journals", err);
    }
  };

  useEffect(() => {
    if (user) fetchJournals();
  }, [user]);

  /* =======================
     LOGIN / LOGOUT
  ======================= */
  const login = async () => {
    if (!email.trim()) return;

    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setJournals([]);
    setChatMessages([]);
    setVoiceResult(null);
  };

  /* =======================
     SUBMIT JOURNAL
  ======================= */
  const submitJournal = async () => {
    if (!text.trim() || !user?.id) return;

    await fetch("http://localhost:5000/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        mood,
        userId: user.id
      })
    });

    setText("");
    setMood("neutral");
    fetchJournals();
  };

  /* =======================
     CHATBOT
  ======================= */
  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: chatInput }
    ]);

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput })
      });

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply }
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I’m here with you. Please try again." }
      ]);
    }

    setChatInput("");
  };

  /* =======================
     🎤 VOICE WELLBEING (WEB SPEECH API)
  ======================= */
  const startVoiceCheck = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    setListening(true);
    setVoiceResult(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let words: string[] = [];
    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        words.push(event.results[i][0].transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setVoiceResult("Unable to analyze voice");
      recognition.stop();
    };

    recognition.onend = () => {
      const duration = (Date.now() - startTime) / 1000;
      const wordCount = words.join(" ").trim().split(/\s+/).length;
      const speechRate = wordCount / Math.max(duration, 1);

      let indicator = "Normal";
      if (speechRate < 1.5) indicator = "Elevated Stress";

      setVoiceResult(indicator);
      setListening(false);
    };

    recognition.start();

    // Auto stop after 15 seconds
    setTimeout(() => recognition.stop(), 15000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex justify-center">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-semibold mb-2 text-center text-gray-800">
          Mental Health Journal
        </h1>
        <p className="text-center text-gray-600 mb-8">
          A private, supportive space to reflect and feel better.
        </p>

        {!user && (
          <div className="bg-white/90 p-5 rounded-2xl shadow-md mb-6">
            <input
              className="w-full border p-2 rounded mb-3"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={login}
              className="w-full bg-indigo-600 text-white p-2 rounded"
            >
              Login
            </button>
          </div>
        )}

        {user && (
          <>
            {/* USER BAR */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Logged in as <strong>{user.email}</strong>
              </p>
              <button
                onClick={logout}
                className="text-sm text-red-600 underline"
              >
                Logout
              </button>
            </div>

            {/* 🎤 VOICE WELLBEING */}
            <div className="bg-white/90 p-5 rounded-2xl shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-1">
                Voice-Based Wellbeing Check
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                We analyze speech pace only. No audio is stored.
                This is not a medical or diagnostic tool.
              </p>

              <button
                onClick={startVoiceCheck}
                disabled={listening}
                className="w-full bg-purple-600 text-white p-2 rounded"
              >
                {listening ? "Listening..." : "Talk for 15 seconds"}
              </button>

              {voiceResult && (
                <p className="text-sm mt-2">
                  🧠 Wellbeing indicator:{" "}
                  <strong>{voiceResult}</strong>
                </p>
              )}
            </div>

            {/* JOURNAL INPUT */}
            <div className="bg-white/90 p-5 rounded-2xl shadow-md mb-6">
              <textarea
                className="w-full border p-2 rounded mb-3"
                placeholder="Write how you feel today..."
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <select
                className="w-full border p-2 rounded mb-3"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                <option value="neutral">Neutral</option>
                <option value="happy">Happy</option>
                <option value="stressed">Stressed</option>
                <option value="anxious">Anxious</option>
                <option value="sad">Sad</option>
              </select>

              <button
                onClick={submitJournal}
                className="w-full bg-emerald-600 text-white p-2 rounded"
              >
                Save Journal
              </button>
            </div>

            {/* JOURNAL HISTORY (UNCHANGED) */}
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              Your Entries
            </h2>

            {journals.map((j) => (
              <div
                key={j.id}
                className="bg-white/90 p-4 rounded-2xl shadow-md mb-3"
              >
                <p className="mb-1">{j.text}</p>
                <small className="text-gray-500">
                  Mood: {j.mood} | AI Sentiment: {j.sentiment}
                  <br />
                  {new Date(j.createdAt).toLocaleString()}
                </small>
              </div>
            ))}

            {/* CHATBOT */}
            <div className="bg-white/90 p-5 rounded-2xl shadow-md mt-8">
              <h2 className="text-lg font-semibold mb-1 text-gray-800">
                Support Chat
              </h2>

              <div className="h-40 overflow-y-auto border p-3 rounded mb-3 bg-white">
                {chatMessages.map((m, i) => (
                  <div key={i} className="text-sm mb-2">
                    <strong>{m.sender}:</strong> {m.text}
                  </div>
                ))}
              </div>

              <input
                className="w-full border p-2 rounded mb-2"
                placeholder="Type how you're feeling..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />

              <button
                onClick={sendMessage}
                className="w-full bg-violet-600 text-white p-2 rounded"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
