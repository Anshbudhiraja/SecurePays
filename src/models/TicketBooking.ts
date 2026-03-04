import mongoose,{Schema,Document} from "mongoose";
interface IPassenger {
    name: string;
    age: number;
    gender: "Male" | "Female" | "Other";
}

export interface ITicketBooking extends Document {
    userId: mongoose.Types.ObjectId;
    ticketId: mongoose.Types.ObjectId; 
    passengers: IPassenger[];
    totalSeats: number;
    totalAmount: number;
}

const ticketBookingSchema = new Schema<ITicketBooking>({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "tickets", required: true },
    passengers: [{
        name: { type: String, required: true, trim: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    }],
    totalSeats: { type: Number, required: true },
    totalAmount: { type: Number, required: true }
}, { timestamps: true });

const TicketBooking = mongoose.model<ITicketBooking>("TicketBooking", ticketBookingSchema);

export default TicketBooking;