import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import crypto from "node:crypto";

import db from "@/database/db.js";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "@/utils/errors/index.js";
import { attachCookieToResponse } from "@/utils/auth/jwt.js";
import generateEmail from "@/services/email/email-template.js";
import sendEmail from "@/services/email/email-service.js";

const generateToken = () => {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1) + min);
};

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
  res.clearCookie("accessToken");

  res.status(StatusCodes.OK).json({ status: "success" });
};

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { email: true },
  });
  if (!existingUser) {
    throw new NotFoundError("User not Found");
  }

  const resetToken = generateToken().toString();
  const fifTeenMinutes = 1000 * 60 * 15;
  const resetTokenExpiry = new Date(Date.now() + fifTeenMinutes);

  const emailHtml = generateEmail({
    title: "PASSWORD RESET",
    subject: "Reset your Password",
    text: "Use the code below to reset your password. This code is valid for only 15 minutes.",
    resetData: resetToken,
  });

  const emailSent = await sendEmail("PASSWORD RESET", email, emailHtml);

  if (!emailSent) {
    throw new Error("Email not sent, an error occurred");
  }

  await db.user.update({
    where: { email },
    data: { resetToken, resetTokenExpiry },
  });

  res.status(StatusCodes.OK).json({
    status: "success",
    data: `Email sent Successfully to ${email}`,
    error: null,
  });
};

const verifyResetToken = async (req: Request, res: Response) => {
  const { email, resetToken } = req.body;

  const existingUser = await db.user.findUnique({
    where: {
      email,
      resetToken,
      resetTokenExpiry: { gte: new Date() },
    },
    select: { email: true },
  });

  if (!existingUser) {
    throw new NotFoundError("Invalid User or Token");
  }

  res.status(StatusCodes.OK).json({ status: "success" });
};

const changePassword = async (req: Request, res: Response) => {
  const { newPassword, resetToken, email } = req.body;

  const existingUser = await db.user.findUnique({
    where: { email, resetToken, resetTokenExpiry: { gte: new Date() } },
    select: { id: true },
  });

  if (!existingUser) {
    throw new NotFoundError("Invalid or Expired Token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: existingUser.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  res.status(StatusCodes.OK).json({ status: "success" });
};

const sendVerificationEmail = async (req: Request, res: Response) => {
  const { email } = req.body;
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { email: true },
  });
  if (!existingUser) {
    throw new NotFoundError("User not Found");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const fifTeenMinutes = 1000 * 60 * 15;
  const verificationTokenExpiry = new Date(Date.now() + fifTeenMinutes);
  const verificationLink = `http://localhost:5000/auth/verify-email?token=${verificationToken}`;

  const emailHtml = generateEmail({
    title: "EMAIL VERIFICATION",
    subject: "Verify your email",
    text: "Use this link to verify your email. This link is valid for only 15 minutes.",
    resetData: verificationLink,
  });

  const emailSent = await sendEmail("EMAIL VERIFICATION", email, emailHtml);

  if (!emailSent) {
    throw new Error("Email not sent, an error occurred");
  }

  await db.user.update({
    where: { email },
    data: { verificationToken, verificationTokenExpiry },
  });

  res.status(StatusCodes.OK).json({
    status: "success",
    data: `Email sent Successfully to ${email}`,
    error: null,
  });
};

const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    throw new BadRequestError("Invalid verification link");
  }

  const user = await db.user.findFirst({
    where: {
      verificationToken: token as string,
      verificationTokenExpiry: { gte: new Date() },
    },
    select: { email: true },
  });

  if (!user) {
    throw new NotFoundError("Invalid or expired Token");
  }

  await db.user.update({
    where: { email: user.email },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  res.status(StatusCodes.OK).json({
    status: "success",
    data: "Email verified successfully",
    error: null,
  });
};

export {
  register,
  login,
  logOut,
  forgotPassword,
  verifyResetToken,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
};
