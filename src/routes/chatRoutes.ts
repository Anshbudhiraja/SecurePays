import express from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {sendMessage,getConversations,getMessages, searchUsers, markMessagesAsSeen} from "../controllers/chatController";
const router = express.Router();

router.post("/send-message", authMiddleware, sendMessage);
router.get("/conversations", authMiddleware, getConversations);
router.get("/messages/:conversationId", authMiddleware, getMessages);
router.get("/search-users", authMiddleware, searchUsers);
router.post("/mark-messages-as-seen/:conversationId", authMiddleware, markMessagesAsSeen);
export default router;