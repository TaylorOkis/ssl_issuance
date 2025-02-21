import { StatusCodes } from "http-status-codes";

class CustomAPIError extends Error {
  statusCode: any;
  // statusCode: StatusCodes;
  constructor(message: string) {
    super(message);
    // this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

export default CustomAPIError;
