import { Router } from "express";
import { 
    addTicket, 
    getTickets, 
    updateTicket, 
    deleteTicket 
} from "../../controllers/ticketController";
const router = Router();
router.post("/create", addTicket);
router.get("/", getTickets);
router.put("/update/:id", updateTicket);
router.delete("/delete/:id", deleteTicket);
export default router;