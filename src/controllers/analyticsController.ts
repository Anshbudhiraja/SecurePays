import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";
import { Statement } from "../models/Statements";

export const getAllUsers = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            return responseHandler(resp, 403, "Access Denied: Super Admin privileges required", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = 10;
        const skip = (page - 1) * limit;

        const users = await User.find({role:{$ne:"superadmin"}})
            .select("-password") 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalUsers = await User.countDocuments({role:{$ne:"superadmin"}});

        responseHandler(resp, 200, "Users fetched successfully", "success", {
            users,
            pagination: {
                totalUsers,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                hasNextPage: page * limit < totalUsers,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error("SuperAdmin Fetch Users Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getUserJoiningTrends = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            return responseHandler(resp, 403, "Forbidden: Super Admin access required", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        const daysToLookBack = 10;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (daysToLookBack - 1)); // -9 to include today
        startDate.setHours(0, 0, 0, 0);

        const newUsers = await User.find({
            createdAt: { $gte: startDate }
        }).select("createdAt");

        const registrationMap = new Map<string, number>();

        for (let i = 0; i < daysToLookBack; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            registrationMap.set(dateString, 0);
        }

        newUsers.forEach(user => {
            const dateString = user.createdAt.toISOString().split('T')[0];
            if (registrationMap.has(dateString)) {
                registrationMap.set(dateString, (registrationMap.get(dateString) || 0) + 1);
            }
        });

        const chartData: { date: string; count: number }[] = [];

        registrationMap.forEach((count, date) => {
            chartData.push({
                date,
                count
            });
        });

        responseHandler(resp, 200, "User joining trends fetched successfully", "success", chartData);

    } catch (error) {
        console.error("User Trend Stats Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getTransactionAmountAnalytics = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
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

        const totals = {
            flight: 0,
            train: 0,
            paid: 0,
            received: 0
        };

        statements.forEach((stmt: any) => {
            if (stmt.type === "ticket") {
                if (stmt.category === "Flight") {
                    totals.flight += Math.abs(stmt.amount);
                } else if (stmt.category === "Train") {
                    totals.train += Math.abs(stmt.amount);
                }
            } else if (stmt.type === "transfer") {
                if (stmt.amount < 0) {
                    totals.paid += Math.abs(stmt.amount);
                } else {
                    totals.received += stmt.amount;
                }
            }
        });

        const chartData = [
            { category: "FLIGHT", amount: totals.flight, color: "#3b82f6" },
            { category: "TRAIN", amount: totals.train, color: "#8b5cf6" },
            { category: "PAID", amount: totals.paid, color: "#ef4444" },
            { category: "RECEIVED", amount: totals.received, color: "#10b981" }
        ];

        responseHandler(resp, 200, "Transaction analytics generated successfully", "success", chartData);

    } catch (error) {
        console.error("Analytics Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getAllStatements = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            return responseHandler(resp, 403, "Forbidden: Super Admin access required", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = 10;
        const skip = (page - 1) * limit;

        const statements = await Statement.find({})
            .populate("userId", "firstName lastName email") 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const formattedStatements = statements.map((stmt: any) => {
            const user = stmt.userId;
            
            let displayCategory = "";
            if (stmt.type === "ticket") {
                displayCategory = `${stmt.category} Ticket`;
            } else {
                displayCategory = stmt.amount < 0 ? "Paid Transfer" : "Received Transfer";
            }

            return {
                user: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown",
                email: user?.email || "N/A",
                type: stmt.type,
                category: displayCategory,
                amount: `₹${Math.abs(stmt.amount)}`,
                date: stmt.createdAt.toISOString().split('T')[0],
                status: stmt.status
            };
        });

        const totalRecords = await Statement.countDocuments({});

        responseHandler(resp, 200, "All platform statements fetched", "success", {
            records: formattedStatements,
            pagination: {
                totalRecords,
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit)
            }
        });

    } catch (error) {
        console.error("SuperAdmin Statement Fetch Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};