const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 8000;

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Test server is running!" });
});

// Test API route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log("✅ Basic Express setup is working!");
});
