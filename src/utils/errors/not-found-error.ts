import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api-error.js";

class NotFoundError extends CustomAPIError {
  statusCode: StatusCodes;
  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.NOT_FOUND;
  }
}

export default NotFoundError;
