import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await (prisma.privateMessage as any).count();
        console.log('--- CHAT SERVICE STATUS ---');
        console.log(`PrivateMessage count: ${count}`);
        console.log('Tables are provisioned successfully.');
    } catch (e) {
        console.error('FAILED to query PrivateMessage table:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
