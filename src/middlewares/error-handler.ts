import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "@/utils/errors/index.js";

const errorHandler = (
  error: Error | CustomAPIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let customerror = {
    statusCode:
      error instanceof CustomAPIError
        ? error.statusCode
        : StatusCodes.INTERNAL_SERVER_ERROR,
    status: "fail",
    error: error.message || "Something went wrong, please try again later",
  };

  res
    .status(customerror.statusCode)
    .json({ status: customerror.status, error: customerror.error });
};

export default errorHandler;
