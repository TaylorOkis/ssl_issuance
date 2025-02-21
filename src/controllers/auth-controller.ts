import db from "@/database/db";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import { BadRequestError, UnauthenticatedError } from "@/utils/errors";
import bcrypt from "bcryptjs";
import { attachCookieToResponse } from "@/utils/auth/jwt";

const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existingEmail = await db.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new BadRequestError("User already exists");
  }

  console.log("email: ", email);

  console.log("password: ", password);

  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("password: ", hashedPassword);

  await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  res
    .status(StatusCodes.CREATED)
    .json({ status: "success", message: "User Created Successfully" });
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const errorMessage = "Wrong username or password";

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    throw new UnauthenticatedError(errorMessage);
  }

  const passwordMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatch) {
    throw new UnauthenticatedError(errorMessage);
  }

  const { password: savedPassword, ...tokenUser } = existingUser;
  attachCookieToResponse({ res, user: tokenUser });

  res
    .status(StatusCodes.OK)
    .json({ status: "success", message: "User Login Successfully" });
};

const logOut = (req: Request, res: Response) => {
  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now() + 3 * 1000),
  });

  res.status(StatusCodes.OK).json({ status: "success" });
};

export { register, login, logOut };
