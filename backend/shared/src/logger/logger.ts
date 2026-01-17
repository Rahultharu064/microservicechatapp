import winston from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom dev format
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

const isProduction = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    isProduction ? json() : devFormat
  ),
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? json()
        : combine(colorize({ all: true }), devFormat),
    }),
  ],
  exitOnError: false,
});

export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
