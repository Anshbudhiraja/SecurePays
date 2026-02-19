import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
    ticketType: "Flight" | "Train"; 
    name: string;
    source: string;
    destination: string;
    date: Date;
    timing: string;
    price: number;
    tax: number;
    discount: number;
    seatsAvailable: number;
    createdAt: Date;
    updatedAt: Date;
}

const ticketSchema: Schema<ITicket> = new Schema(
    {
        ticketType: {
            type: String,
            required: true,
            enum: ["Flight", "Train"]
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        source: {
            type: String,
            required: true,
            trim: true
        },
        destination: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: Date,
            required: true
        },
        timing: {
            type: String, 
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        tax: {
            type: Number,
            required: false,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            required: false,
            default: 0,
            min: 0
        },
        seatsAvailable: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { timestamps: true }
);

const Ticket = mongoose.model<ITicket>("tickets", ticketSchema);
export default Ticket;