import logger from "@/utils/log/logger";
import morgan, { StreamOptions } from "morgan";

const morganFormat = ":method :url :status :response-time ms";

const stream: StreamOptions = {
  write: (message) => {
    const parts = message.trim().split(" ");
    const statusCode = parseInt(parts[2]);
    const logObject = {
      method: parts[0],
      url: parts[1],
      status: parts[2],
      responseTime: parseFloat(parts[3]) + parts[4],
    };

    if (statusCode >= 500) {
      logger.error(JSON.stringify(logObject)); // Critical server errors
    } else if (statusCode >= 400) {
      logger.warn(JSON.stringify(logObject)); // Client errors (e.g., 404)
    } else if (statusCode >= 300) {
      logger.http(JSON.stringify(logObject)); // Redirects
    } else {
      logger.info(JSON.stringify(logObject)); // Successful requests
    }
  },
};

const skip = () => {
  return process.env.NODE_ENV === "production";
};

const morganMiddleware = morgan(morganFormat, {
  stream: stream,
  skip,
});

export default morganMiddleware;
