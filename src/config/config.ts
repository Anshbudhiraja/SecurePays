import dotenv from "dotenv"
dotenv.config()
export const config = {
    EMAIL_SERVICE_EMAIL:process.env.EMAIL_SERVICE_EMAIL,
    EMAIL_SERVICE_PASS:process.env.EMAIL_SERVICE_PASS,
    MONGODB_URI:process.env.MONGODB_URI,
    SECRET_KEY:process.env.SECRET_KEY,
    BACKEND_DOMAIN:process.env.BACKEND_DOMAIN
}