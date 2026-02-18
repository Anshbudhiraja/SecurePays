import { Router } from "express";
import { 
    loginUser, 
    verifyUser, 
    checkUserDetails, 
    updateUserDetails 
} from "../controllers/userController";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

router.post("/login", loginUser);
router.post("/verify", verifyUser);
router.get("/checkUserDetails", authMiddleware, checkUserDetails);
router.put("/updateUserDetails", authMiddleware, updateUserDetails);

export default router;