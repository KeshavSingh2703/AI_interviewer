#!/usr/bin/env node
/**
 * Startup script for AI Interviewer Web Application
 * This script helps you start both the backend and frontend servers
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function checkDependencies() {
  console.log("🔍 Checking dependencies...");

  // Check if Node.js is installed
  try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js found: ${nodeVersion}`);
  } catch (error) {
    console.log("❌ Node.js is not installed. Please install Node.js 16+");
    return false;
  }

  // Check if npm is installed
  try {
    const npmVersion = require("child_process").execSync("npm --version", {
      encoding: "utf8",
    });
    console.log(`✅ npm found: ${npmVersion.trim()}`);
  } catch (error) {
    console.log("❌ npm is not installed");
    return false;
  }

  return true;
}

function setupBackend() {
  console.log("\n🟨 Setting up Express.js backend...");

  const backendDir = path.join(__dirname, "backend");
  if (!fs.existsSync(backendDir)) {
    console.log("❌ Backend directory not found");
    return false;
  }

  // Install npm dependencies
  console.log("📦 Installing Node.js dependencies...");
  try {
    require("child_process").execSync("npm install", {
      cwd: backendDir,
      stdio: "inherit",
      shell: true,
    });
  } catch (error) {
    console.log("❌ Failed to install backend dependencies");
    return false;
  }

  return true;
}

function setupFrontend() {
  console.log("\n⚛️  Setting up frontend...");

  const frontendDir = path.join(__dirname, "frontend");
  if (!fs.existsSync(frontendDir)) {
    console.log("❌ Frontend directory not found");
    return false;
  }

  // Install npm dependencies
  console.log("📦 Installing npm dependencies...");
  try {
    require("child_process").execSync("npm install", {
      cwd: frontendDir,
      stdio: "inherit",
      shell: true,
    });
  } catch (error) {
    console.log("❌ Failed to install frontend dependencies");
    return false;
  }

  return true;
}

function startServers() {
  console.log("\n🚀 Starting servers...");

  const backendDir = path.join(__dirname, "backend");
  const frontendDir = path.join(__dirname, "frontend");

  // Start backend server
  console.log("🔧 Starting Express.js backend server on http://localhost:8000");
  const backendProcess = spawn("npm", ["start"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: true,
  });

  // Wait a moment for backend to start
  setTimeout(() => {
    // Start frontend server
    console.log("🎨 Starting frontend server on http://localhost:3000");
    const frontendProcess = spawn("npm", ["start"], {
      cwd: frontendDir,
      stdio: "inherit",
      shell: true,
    });

    // Wait a moment for frontend to start
    setTimeout(() => {
      console.log("\n✅ AI Interviewer Web Application is running!");
      console.log("📱 Frontend: http://localhost:3000");
      console.log("🔧 Backend: http://localhost:8000");
      console.log("\nPress Ctrl+C to stop the servers");
    }, 5000);

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("\n🛑 Stopping servers...");
      backendProcess.kill();
      frontendProcess.kill();
      console.log("✅ Servers stopped");
      process.exit(0);
    });

    frontendProcess.on("close", (code) => {
      console.log(`Frontend process exited with code ${code}`);
    });
  }, 3000);

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping servers...");
    backendProcess.kill();
    console.log("✅ Servers stopped");
    process.exit(0);
  });

  backendProcess.on("close", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function main() {
  console.log("🤖 AI Interviewer Web Application");
  console.log("=".repeat(40));

  // Change to the script's directory
  process.chdir(__dirname);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }

  // Setup backend
  if (!setupBackend()) {
    process.exit(1);
  }

  // Setup frontend
  if (!setupFrontend()) {
    process.exit(1);
  }

  // Start servers
  startServers();
}

if (require.main === module) {
  main();
}
