import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

const register = (req: Request, res: Response) => {
  res.status(StatusCodes.OK).send("Registeration works");
};

const login = (req: Request, res: Response) => {
  res.status(StatusCodes.OK).send("Login works");
};

const logOut = (req: Request, res: Response) => {
  res.status(StatusCodes.OK).send("Logout works");
};

export { register, login, logOut };
