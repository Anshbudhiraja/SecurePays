import { Router } from "express";
import { bookTicket, getMyBookings, searchTickets } from "../../controllers/ticketBookingController";

const router = Router();

router.get("/searchTickets",searchTickets)
router.post("/bookTicket",bookTicket)
router.get("/getMyBookings",getMyBookings)
export default router;