import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage?: string;
}

const conversationSchema = new Schema({
    participants: [{ type: Schema.Types.ObjectId, ref: "users" }],
    lastMessage: { type: String }
}, { timestamps: true });

export const Conversation = mongoose.model<IConversation>("Conversation", conversationSchema);

export interface IMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    text: string;
    seen:Boolean;
}

const messageSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    text: { type: String, required: true },
    seen: { 
    type: Boolean, 
    default: false 
    }
}, { timestamps: true });

export const Message = mongoose.model<IMessage>("Message", messageSchema);