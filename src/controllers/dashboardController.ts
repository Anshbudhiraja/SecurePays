import { Response } from "express";
import { Statement, TransferStatement, TicketStatement } from "../models/Statements";
import User from "../models/User";
import BankAccount from "../models/BankAccounts";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";

export const getCashFlowAnalysis = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        const daysToLookBack = 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToLookBack);
        startDate.setHours(0, 0, 0, 0);

        const statements = await Statement.find({
            userId: req.user._id,
            status: "completed",
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        const cashFlowMap = new Map<string, { inflow: number; outflow: number }>();

        for (let i = 0; i <= daysToLookBack; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            cashFlowMap.set(dateString, { inflow: 0, outflow: 0 });
        }

        statements.forEach(stmt => {
            const dateString = stmt.createdAt.toISOString().split('T')[0];
            const current = cashFlowMap.get(dateString) || { inflow: 0, outflow: 0 };

            if (stmt.amount > 0) {
                current.inflow += stmt.amount;
            } else {
                current.outflow += Math.abs(stmt.amount);
            }
            cashFlowMap.set(dateString, current);
        });

        const chartData: { label: string; inflow: number; outflow: number }[] = [];

        cashFlowMap.forEach((value, key) => {
            chartData.push({
                label: key,
                inflow: value.inflow,
                outflow: value.outflow
            });
        });

        responseHandler(resp, 200, "Cash flow analysis generated", "success", chartData);

    } catch (error) {
        console.error("Dashboard Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getSpendingComposition = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        const statements = await Statement.find({
            userId: req.user._id,
            status: "completed"
        });

        const composition = {
            flightTickets: 0,
            trainTickets: 0,
            pay: 0,
            receive: 0
        };

        statements.forEach((stmt: any) => {
            if (stmt.type === "ticket") {
                if (stmt.category === "Flight") {
                    composition.flightTickets += Math.abs(stmt.amount);
                } else if (stmt.category === "Train") {
                    composition.trainTickets += Math.abs(stmt.amount);
                }
            } else if (stmt.type === "transfer") {
                if (stmt.amount > 0) {
                    composition.receive += stmt.amount;
                } else {
                    composition.pay += Math.abs(stmt.amount);
                }
            }
        });

        const chartData = [
            { name: "Flight Tickets", value: composition.flightTickets, fill: "#3b82f6" }, // Blue
            { name: "Train Tickets", value: composition.trainTickets, fill: "#8b5cf6" },  // Purple
            { name: "Payments (Pay)", value: composition.pay, fill: "#ef4444" },          // Red
            { name: "Income (Receive)", value: composition.receive, fill: "#10b981" }     // Green
        ];

        const totalVolume = chartData.reduce((acc, curr) => acc + curr.value, 0);

        responseHandler(resp, 200, "Spending composition generated", "success", {
            totalVolume,
            chartData
        });

    } catch (error) {
        console.error("Spending Composition Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getTicketBookingTrends = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        const daysToLookBack = 6;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToLookBack);
        startDate.setHours(0, 0, 0, 0);

        const ticketStatements = await Statement.find({
            userId: req.user._id,
            type: "ticket",
            status: "completed",
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        const trendMap = new Map<string, { train: number; flight: number }>();

        for (let i = 0; i <= daysToLookBack; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            trendMap.set(dateString, { train: 0, flight: 0 });
        }

        ticketStatements.forEach((stmt: any) => {
            const dateString = stmt.createdAt.toISOString().split('T')[0];
            const current = trendMap.get(dateString) || { train: 0, flight: 0 };

            if (stmt.category === "Train") {
                current.train += Math.abs(stmt.amount)
            } else if (stmt.category === "Flight") {
                current.flight += Math.abs(stmt.amount)
            }
            trendMap.set(dateString, current);
        });

        const chartData: { date: string; train: number; flight: number }[] = [];

        trendMap.forEach((value, key) => {
            chartData.push({
                date: key,
                train: value.train,
                flight: value.flight
            });
        });

        responseHandler(resp, 200, "Ticket booking trends generated", "success", chartData);

    } catch (error) {
        console.error("Ticket Trend Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getDashboardSummary = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        const userId = req.user._id;

        const upcomingDepartures = await TicketStatement.countDocuments({
            userId,
            status: "completed"
        });

        const transfers = await TransferStatement.find({ userId }).select("status");
        
        let successRate = 0;
        if (transfers.length > 0) {
            const completedCount = transfers.filter(t => t.status === "completed").length;
            successRate = Math.round((completedCount / transfers.length) * 100);
        }

        const flaggedTransactions = await Statement.countDocuments({
            userId,
            status: "pending"
        });

        const [user, hasBank] = await Promise.all([
            User.findById(userId),
            BankAccount.exists({ userId })
        ]);

        let securityScore = 0;
        if (user?.verified) securityScore += 20;
        if (user?.kyc_verified) securityScore += 40;
        if (user?.upiId) securityScore += 20;
        if (hasBank) securityScore += 20;

        const summary = {
            travelPortfolio: {
                activeTickets: upcomingDepartures,
                label: "Upcoming Departures"
            },
            performance: {
                successRate: `${successRate}%`,
                label: "Transfer Success Rate"
            },
            security: {
                flaggedCount: flaggedTransactions,
                label: "Recent Disputes"
            },
            integrity: {
                score: securityScore,
                label: "Security Score",
                status: securityScore > 70 ? "Strong" : securityScore > 40 ? "Moderate" : "Weak"
            }
        };

        responseHandler(resp, 200, "Dashboard summary fetched successfully", "success", summary);

    } catch (error) {
        console.error("Summary Controller Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};