import express, { Express } from "express";
import cors from "cors";
import path from "path";
import routes from "./routes/router";
import connectDB from "./config/connectDB";
import { initializeFirebase } from "./config/firebase";

const app: Express = express();

initializeFirebase();
app.use(express.json());
app.use(cors());

app.use("/api", routes);

app.use("/uploads", express.static(path.resolve("uploads")));

connectDB();

const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

app.listen(PORT, () => {
    console.log(`Server Started At PORT: ${PORT}`);
});