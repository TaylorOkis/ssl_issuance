import { createLogger, format, transports } from "winston";
const { combine, timestamp, colorize, json } = format;

const consoleLogFormat = format.combine(
  format.colorize(),
  format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}] : ${message}`;
  })
);

const logger = createLogger({
  level: "http",
  format: combine(colorize(), timestamp(), json()),
  transports: [
    new transports.Console({ format: consoleLogFormat }),
    new transports.File({ filename: "./src/utils/log/app.log" }),
  ],
});

// if in production, disable console loggging
if (process.env.NODE_ENV === "production") {
  logger.remove(new transports.Console());
}

export default logger;
