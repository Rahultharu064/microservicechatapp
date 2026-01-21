import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tables = await prisma.$queryRawUnsafe<any[]>('SHOW TABLES');
    console.log('--- TABLES IN DB ---');
    tables.forEach(row => {
        console.log(Object.values(row)[0]);
    });
    console.log('--- END TABLES ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
