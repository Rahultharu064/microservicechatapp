import { prisma } from "../config/db.ts";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.ts";


export class AdminService {
    static async getStats() {
        const [users, reports, pendingReports] = await Promise.all([
            prisma.user.count(),
            prisma.report.count(),
            prisma.report.count({ where: { status: "PENDING" } })
        ]);

        return {
            totalUsers: users,
            totalReports: reports,
            pendingReports
        };
    }

    static async createReport(userId: string, reason: string, reporterId: string) {
        const report = await prisma.report.create({
            data: {
                userId, // The user being reported
                reporterId: reporterId as any,
                reason,
            }
        });

        // Publish event for Admin Notification
        await publishToQueue("admin.notifications", {
            type: "report.created",
            reportId: report.id,
            reason: report.reason
        });

        return report;
    }

    static async suspendUser(userId: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: true }
        });

        await publishToQueue("user.events", {
            type: "user.suspended",
            userId: user.id
        });

        return user;
    }

    static async unsuspendUser(userId: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: false }
        });

        await publishToQueue("user.events", {
            type: "user.unsuspended",
            userId: user.id
        });

        return user;
    }

    static async getReports(status?: "PENDING" | "RESOLVED" | "REJECTED") {
        const where = status ? { status } : {};
        return prisma.report.findMany({
            where,
            include: { user: { select: { username: true, email: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async resolveReport(reportId: string, status: "RESOLVED" | "REJECTED") {
        return prisma.report.update({
            where: { id: reportId },
            data: { status }
        });
    }
}
