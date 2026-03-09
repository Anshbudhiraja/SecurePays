import { getChannel } from "../config/rabbitmq";
import { getIO } from "../config/socket";
import { Conversation, Message } from "../models/Chat";
import User from "../models/User";

export const startChatWorker = async () => {
  const channel = getChannel();
  const io = getIO();
  await channel.prefetch(100);
  console.log("Worker started: Waiting for messages...");

  channel.consume("chat_messages",async (data:any) => {
    if (!data) return;
     try {
       const { senderId, receiverId, text } = JSON.parse(data.content.toString())

        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return channel.ack(data);
        }
        let conversation = await Conversation.findOneAndUpdate(
        { participants: { $all: [senderId, receiverId] } },
        { lastMessage: text },
        { upsert: true, new: true }
      );
        
      const message = await Message.create({
        conversationId: conversation._id,
        senderId,
        text
      });
      io.to(receiverId.toString()).emit("newMessage", message);
      io.to(senderId.toString()).emit("newMessage", message);
      channel.ack(data);
     } catch (error) {
      console.error("Worker Error:", error);
      channel.nack(data, false, true);
     }
  });
};