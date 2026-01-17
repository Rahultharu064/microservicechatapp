import amqp from "amqplib";
export declare const createConnectRabbitMQ: () => Promise<amqp.Channel>;
export declare const publishToQueue: (queueName: string, data: any) => Promise<void>;
//# sourceMappingURL=connection.d.ts.map