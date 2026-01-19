import prisma from "@prisma/client"


const prismaClient= new prisma.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})


export default prismaClient;