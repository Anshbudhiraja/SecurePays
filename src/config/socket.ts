import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import disposableEmailDomains from "disposable-email-domains";

import User from "../models/User";
import { config } from "./config";

let io: Server;

interface DecodedToken extends jwt.JwtPayload {
  id: string;
  email: string;
}
const onlineUsers = new Map<string, Set<string>>();
export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.use(async (socket, next) => {
    try {
     const authHeader =socket.handshake.headers.authorization || socket.handshake.auth?.token;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new Error("Invalid or Missing Token"));
      }

      const token = authHeader.split(" ")[1];
      if(!token){
        return next(new Error("Invalid or Missing Token"));
      }

      const secretKey = config.SECRET_KEY as string;
      if (!secretKey) {
        return next(new Error("Missing Secret Key"));
      }

      const decoded = jwt.verify(token, secretKey) as DecodedToken;
      if (!decoded?.email || !decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
        return next(new Error("Unauthorized User"));
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(decoded.email)) {
        return next(new Error("Invalid Email Format"));
      }
      const updatedEmail = decoded.email.trim().toLowerCase();
      const domain = updatedEmail.split("@")[1];

      if (disposableEmailDomains.includes(domain)) {
        return next(new Error("Disposable Email Not Allowed"));
      }
      const existingUser = await User.findOne({
        _id: decoded.id,
        email: updatedEmail
      }).select("-password");
      if (!existingUser) {
        return next(new Error("Unauthorized User"));
      }

      socket.data.user = existingUser;
      next();
    } catch (error) {
      next(new Error("Invalid Token"));
    }
  });

  io.on("connection", async(socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId)?.add(socket.id);
    if (onlineUsers.get(userId)?.size === 1) {
      await User.findByIdAndUpdate(userId, { status: "online" });

      io.emit("userStatusUpdate", {
        userId,
        status: "online",
      });
    }

    socket.join(userId);
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log(`User ${userId} connected with socket ${socket.id}`);

    socket.on("disconnect", async() => {
      const userSockets = onlineUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, { status: "offline" });

        io.emit("userStatusUpdate", {
          userId,
          status: "offline",
        });

        console.log(`User ${userId} offline`);
      }
    }
    });
  });
  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};