import { Response } from "express";
import mongoose from "mongoose";
import { Conversation, Message } from "../models/Chat";
import { getIO } from "../config/socket";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";
import User from "../models/User";
import { getChannel } from "../config/rabbitmq";

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user?._id;
    if (!senderId) {
      return responseHandler(res, 401, "Unauthorized User", "error");
    }
    const { receiverId, text } = req.body;
    if (!receiverId || !mongoose.isValidObjectId(receiverId)) {
      return responseHandler(res, 400, "Invalid receiverId", "error");
    }
    if (!text || typeof text !== "string") {
      return responseHandler(res, 400, "Message text required", "error");
    }

    const channel = getChannel();
    const payload = {
      text,
      receiverId,
      senderId,
      timestamp: new Date()
    };
    channel.sendToQueue("chat_messages", Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    // const io = getIO();
    // io.to(receiverId.toString()).emit("newMessage", message);
    // io.to(senderId.toString()).emit("newMessage", message);
    
    return responseHandler(res, 200, "Message sent", "success");
  } catch (error) {
    console.error(error);
    return responseHandler(res, 500, "Server Error", "error");
  }
};
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return responseHandler(res, 401, "Unauthorized User", "error");
    }
    const conversations = await Conversation.find({
      participants: userId
    }).populate("participants", "firstName lastName image").sort({ updatedAt: -1 });
    return responseHandler(res, 200, "Conversations fetched", "success", conversations);
  } catch (error) {
    return responseHandler(res, 500, "Server Error", "error");
  }
};
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId || !mongoose.isValidObjectId(conversationId)) {
      return responseHandler(res, 400, "Invalid conversationId", "error");
    }
    const messages = await Message.find({
      conversationId
    }).sort({ createdAt: 1 });
    return responseHandler(res, 200, "Messages fetched", "success", messages);
  } catch (error) {
    return responseHandler(res, 500, "Server Error", "error");
  }
};
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    if (!query || typeof query !== "string") {
      return responseHandler(res, 400, "Search query is required", "error");
    }
    const userId = (req as any)?.user._id
    const searchRegex = new RegExp(query, "i");

    const users = await User.find({
      $or: [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } }
      ],role:{$ne:"superadmin"},_id:{$ne:userId}
    }).select("firstName lastName email").skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).sort({ createdAt: -1 });

    const total = await User.countDocuments({
      $or: [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } }
      ],role:{$ne:"superadmin"},_id:{$ne:userId}
    });

    return responseHandler(res, 200, "Users fetched successfully", "success", {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error(error);
    return responseHandler(res, 500, "Server Error", "error");
  }
};
export const markMessagesAsSeen = async (req: AuthRequest, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = (req as any).user?._id;
        if (!conversationId || !mongoose.isValidObjectId(conversationId)) {
          return responseHandler(res, 400, "Invalid conversationId", "error");
        }
        await Message.updateMany(
            { conversationId, senderId: { $ne: userId }, seen: false },
            { $set: { seen: true } }
        );

        const conversation = await Conversation.findById(conversationId);
        const otherParticipantId:any = conversation?.participants.find(p => p.toString() !== userId.toString());
        
        if (otherParticipantId) {
          const io = getIO();
          io.to(otherParticipantId.toString()).emit("messagesSeen", { conversationId });
        }

        return responseHandler(res, 200, "Messages marked as seen", "success");
    } catch (error) {
        return responseHandler(res, 500, "Server Error", "error");
    }
};