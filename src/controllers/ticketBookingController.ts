import { Response } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Tickets";
import TicketBooking from "../models/TicketBooking";
import { TicketStatement } from "../models/Statements";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";

export const searchTickets = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user?.service || !req.user?.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user?.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }
        const { source, destination, name, ticketType } = req.query;

        const query: any = { seatsAvailable: { $gt: 0 } };
        if(ticketType && typeof ticketType !== "string"){
            return responseHandler(resp,400,"Invalid Ticket Type","error")
        }

        if(ticketType && !["Train","Flight"].includes(ticketType)){
            return responseHandler(resp,400,"Invalid Ticket Type","error")
        }

        if(source && typeof source !== "string"){
            return responseHandler(resp,400,"Invalid Source","error")
        }
        
        if(destination && typeof destination !== "string"){
            return responseHandler(resp,400,"Invalid Destination","error")
        }
        
        if(name && typeof name !== "string"){
            return responseHandler(resp,400,"Invalid Name","error")
        }

        if (source) query.source = new RegExp(source as string, "i");
        if (destination) query.destination = new RegExp(destination as string, "i");
        if (name) query.name = new RegExp(name as string, "i");
        if (ticketType) query.ticketType = ticketType;

        const tickets = await Ticket.find(query).sort({ date: 1 });

        responseHandler(resp, 200, "Tickets fetched successfully", "success", tickets);
    } catch (error) {
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};

export const bookTicket = async (req: AuthRequest, resp: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user?.service || !req.user?.verified) {
            await session.abortTransaction();
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user?.kyc_verified){
            await session.abortTransaction();
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }
        if (!req.user) {
            await session.abortTransaction();
            return responseHandler(resp, 401, "Unauthorized", "error");
        }

        const { ticketId, passengers } = req.body;

        if (!ticketId || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
            await session.abortTransaction();
            return responseHandler(resp, 400, "Invalid booking details", "error");
        }

        const ticket = await Ticket.findById(ticketId).session(session);
        if (!ticket || ticket.seatsAvailable < passengers.length) {
            await session.abortTransaction();
            return responseHandler(resp, 400, "Insufficient seats available", "error");
        }

        for (const p of passengers) {
            if (!p.name || !p.age || !p.gender || !["Male", "Female", "Other"].includes(p.gender)) {
                await session.abortTransaction();
                return responseHandler(resp, 400, "All passenger details are required", "error");
            }
        }

        const totalAmount = (ticket.price + (ticket.tax || 0) - (ticket.discount || 0)) * passengers.length;

        const booking = await TicketBooking.create([{
            userId: req.user._id,
            ticketId,
            passengers,
            totalSeats: passengers.length,
            totalAmount
        }], { session });

        await TicketStatement.create([{
            userId: req.user._id,
            amount: totalAmount,
            status: "completed",
            category: ticket.ticketType,
            bookingId: booking[0]._id
        }], { session });

        ticket.seatsAvailable -= passengers.length;
        await ticket.save({ session });

        await session.commitTransaction();
        responseHandler(resp, 201, "Ticket booked successfully", "success", booking[0]);
    } catch (error) {
        await session.abortTransaction();
        console.error("Booking Error:", error);
        responseHandler(resp, 500, "Booking failed", "fail");
    } finally {
        session.endSession();
    }
};

export const getMyBookings = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user?.service || !req.user?.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user?.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }
        if (!req.user) {
            return responseHandler(resp, 401, "Unauthorized", "error");
        }

        const myBookings = await TicketBooking.find({ userId: req.user._id })
            .populate("ticketId")
            .sort({ createdAt: -1 });

        responseHandler(resp, 200, "Booking history fetched", "success", myBookings);
    } catch (error) {
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};