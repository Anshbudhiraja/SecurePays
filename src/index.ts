import express, { Express } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import routes from "./routes/router";
import connectDB from "./config/connectDB";
import { initializeFirebase } from "./config/firebase";
import { initSocket } from "./config/socket";
import { initRabbitMQ } from "./config/rabbitmq";
import { startChatWorker } from "./workers/chatWorker";
import { globalLimiter } from "./middlewares/rateLimiter";

const startServer = async () => {
  const app: Express = express();
  const server = http.createServer(app);

  try {
    await connectDB(); 
    console.log("Database connected");

    await initRabbitMQ();
    initializeFirebase();
    initSocket(server);

    await startChatWorker();

    app.use(express.json());
    app.use(cors());
    app.use(globalLimiter);
    app.set('trust proxy', 1);
    app.use("/api", routes);
    app.use("/uploads", express.static(path.resolve("uploads")));

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server Started At PORT: ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
startServer()