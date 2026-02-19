import { Response } from "express";
import Tickets from "../models/Tickets"; 
import { AuthRequest } from "../middlewares/authMiddleware"; 
import { responseHandler } from "../handlers/responseHandler";
import mongoose from "mongoose";

export const addTicket = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { 
            ticketType, name, source, destination, 
            date, timing, price, tax, discount, seatsAvailable 
        } = req.body;

        if (!ticketType || !name || !source || !destination || !date || !timing || price === undefined || seatsAvailable === undefined) {
            responseHandler(resp, 400, "Missing required ticket details", "error");
            return;
        }
        if(!["Flight", "Train"].includes(ticketType)){
            return responseHandler(resp,400,"Invalid Ticket Type","error")
        }

        const newTicket = await Tickets.create({
            ticketType,
            name,
            source,
            destination,
            date,
            timing,
            price,
            tax: tax || 0,
            discount: discount || 0,
            seatsAvailable
        });

        responseHandler(resp, 201, "Ticket added successfully", "success", newTicket);
    } catch (error) {
        console.error("Error adding ticket:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getTickets = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const tickets = await Tickets.find().sort({ date: 1 });

        if (!tickets || tickets.length === 0) {
            responseHandler(resp, 404, "No tickets found", "error", []);
            return;
        }

        responseHandler(resp, 200, "Tickets fetched successfully", "success", tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const updateTicket = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { id } = req.params;
        const updateData = req.body;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Ticket ID is required", "error");
            return;
        }

        const updatedTicket = await Tickets.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTicket) {
            responseHandler(resp, 404, "Ticket not found", "error");
            return;
        }

        responseHandler(resp, 200, "Ticket updated successfully", "success", updatedTicket);
    } catch (error) {
        console.error("Error updating ticket:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const deleteTicket = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { id } = req.params;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Ticket ID is required", "error");
            return;
        }

        const deletedTicket = await Tickets.findByIdAndDelete(id);

        if (!deletedTicket) {
            responseHandler(resp, 404, "Ticket not found", "error");
            return;
        }

        responseHandler(resp, 200, "Ticket deleted successfully", "success");
    } catch (error) {
        console.error("Error deleting ticket:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};