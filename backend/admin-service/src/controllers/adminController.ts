import type { Request, Response } from "express";
import { AdminService } from "../services/adminService.ts";

export const adminController = {
    async getStats(req: Request, res: Response) {
        try {
            const stats = await AdminService.getStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async suspendUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updatedUser = await AdminService.suspendUser(id as string);
            res.json({ message: "User suspended", user: updatedUser });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async unsuspendUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updatedUser = await AdminService.unsuspendUser(id as string);
            res.json({ message: "User unsuspended", user: updatedUser });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getReports(req: Request, res: Response) {
        try {
            const { status } = req.query;
            const reports = await AdminService.getReports(status as any);
            res.json(reports);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async resolveReport(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status || !["RESOLVED", "REJECTED"].includes(status)) {
                return res.status(400).json({ error: "Invalid status" });
            }
            const updatedReport = await AdminService.resolveReport(id as string, status);
            res.json(updatedReport);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async createReport(req: Request, res: Response) {
        try {
            const { userId, reason } = req.body; // userId here is the TARGET user
            // reporterId comes from authenticated user
            const reporterId = (req as any).user.id;

            if (!userId || !reason) {
                return res.status(400).json({ error: "Missing userId or reason" });
            }

            const report = await AdminService.createReport(userId, reason, reporterId);
            res.status(201).json(report);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
