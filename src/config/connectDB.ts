import mongoose from "mongoose";
import { config } from "./config";

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = config.MONGODB_URI as string;

        if (!mongoURI) {
            throw new Error("MONGODB_URI is not defined in your .env file.");
        }

        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");
        
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1); 
    }
};

export default connectDB;