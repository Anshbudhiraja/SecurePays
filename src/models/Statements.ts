import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStatement extends Document {
    userId: Types.ObjectId;
    amount: number;
    type: "ticket" | "transfer";
    status: "pending" | "completed" | "failed";
    createdAt: Date;
    bankAccountId?: Types.ObjectId;
}

const statementSchema = new Schema<IStatement>({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "bank-accounts" }
}, { timestamps: true, discriminatorKey: "type" });

const Statement = mongoose.model<IStatement>("Statement", statementSchema);

interface ITicketStatement extends IStatement {
    category: "Train" | "Flight";
    bookingId: Types.ObjectId; // Reference to the detailed TicketBooking schema
}

const TicketStatement = Statement.discriminator<ITicketStatement>("ticket", new Schema({
    category: { type: String, enum: ["Train", "Flight"], required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "TicketBooking", required: true }
}));

interface ITransferStatement extends IStatement {
    transactionId: string;
    receiverUpiId?: string;
}

const TransferStatement = Statement.discriminator<ITransferStatement>("transfer", new Schema({
    transactionId: { type: String, required: true, unique: true },
    receiverUpiId: { type: String },
}));

export { Statement, TicketStatement, TransferStatement };