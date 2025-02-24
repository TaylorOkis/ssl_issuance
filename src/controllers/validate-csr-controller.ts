import { CustomRequest } from "@/types/types";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

const validateCSR = async (req: CustomRequest, res: Response) => {
  res.status(StatusCodes.OK).send("Time to validate CSR");
};

export default validateCSR;
