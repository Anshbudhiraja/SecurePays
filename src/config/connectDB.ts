import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI as string;

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