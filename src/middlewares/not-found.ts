import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "@/utils/errors";

const notFound = (req: Request, res: Response, next: NextFunction) =>
  next(new NotFoundError("Route not Found"));

export default notFound;
