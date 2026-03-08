import * as admin from "firebase-admin";
import path from "path";

const serviceAccountPath = path.resolve(__dirname, "../../firebase-service-account.json");

export const initializeFirebase = () => {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
};