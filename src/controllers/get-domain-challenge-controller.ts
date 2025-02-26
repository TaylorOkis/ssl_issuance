import { CustomRequest } from "@/types/types";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

const getDomainChallenge = async (req: CustomRequest, res: Response) => {
  res.status(StatusCodes.OK).send("Time to set domain challenge");
};

export default getDomainChallenge;
