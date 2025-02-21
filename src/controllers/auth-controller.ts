import db from "@/database/db";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import { BadRequestError } from "@/utils/errors";

const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const existingEmail = await db.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new BadRequestError("User already exists");
  }
};

const login = (req: Request, res: Response) => {
  res.status(StatusCodes.OK).send("Login works");
};

const logOut = (req: Request, res: Response) => {
  res.status(StatusCodes.OK).send("Logout works");
};

export { register, login, logOut };
