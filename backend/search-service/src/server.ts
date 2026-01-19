import app from "./app.ts";
import dotenv from "dotenv"
import { consumeMessages } from "./events/messageConsumer.ts";

dotenv.config();

const PORT = process.env.SEARCH_PORT || 5006;

consumeMessages().then(() => {
    console.log("RabbitMQ consumer started");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
