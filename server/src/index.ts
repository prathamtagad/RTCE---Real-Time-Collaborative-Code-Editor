import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeSchema } from "./db/schema.js";
import { registerSocketHandlers } from "./socket/handlers.js";

const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

async function main() {
  const app = express();
  app.use(cors({ origin: CLIENT_URL }));
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 5e6,
  });

  // Initialize database schema
  await initializeSchema();

  // Register all socket event handlers
  registerSocketHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 RTCE Server running on http://localhost:${PORT}`);
    console.log(`   Accepting connections from ${CLIENT_URL}\n`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
