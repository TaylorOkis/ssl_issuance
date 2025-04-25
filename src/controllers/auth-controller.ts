import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import crypto from "node:crypto";
import { Payload } from "@/types/types";
import db from "@/database/db";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "@/utils/errors";
import { attachCookieToResponse } from "@/utils/auth/jwt";
import generateEmail from "@/services/email/email-template";
import sendEmail from "@/services/email/email-service";

const generateToken = () => {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const register = async (req: Request, res: Response) => {
  console.log('=== REGISTRATION REQUEST START ===');
  console.log('Request body:', req.body);
  //added by zuby
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log('Missing fields detected');
      throw new BadRequestError('Please provide name, email and password');
    }
//end
    console.log('Checking for existing email...');
    

    const existingEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      //added by zuby
      console.log(` Email already exists: ${email}`);
      console.log(` Existing user details:`, {
        id: existingEmail.id,
        name: existingEmail.name,
        createdAt: existingEmail.createdAt
      });
      //end
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
  } catch (error) {
    console.error('Registration error:', error);
    throw error; 
  } finally {
    console.log('=== REGISTRATION REQUEST END ===');
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const errorMessage = "Wrong username or password";

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (!existingUser) throw new UnauthenticatedError(errorMessage);

    const passwordMatch = await bcrypt.compare(password, existingUser.password);
    if (!passwordMatch) throw new UnauthenticatedError(errorMessage);

    const tokenUser = {
      userId: existingUser.id,
      email: existingUser.email,
      username: existingUser.name
    };

    attachCookieToResponse({ res, user: tokenUser });
    console.log('Set-Cookie Header:', res.getHeader('Set-Cookie'));
    
    res.status(200).json({ 
      status: "success",
      user: tokenUser
    });

  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};
// Added by zuby

const verifySession = async (req: Request, res: Response) => {
  console.log('[BACKEND] Incoming cookies:', req.cookies);
  console.log('Incoming cookies:', req.cookies); 
  console.log('Headers:', req.headers); 


  const token = req.signedCookies.accessToken || req.cookies.accessToken;
  
  if (!token) {
    console.warn('[BACKEND] No token found');
    return res.status(200).json({ loggedIn: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[BACKEND] Decoded token:', decoded);
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        email: true, 
        name: true,
       
      }
    });

    if (!user) {
      console.warn('[BACKEND] User not found');
      return res.status(200).json({ loggedIn: false }); 
    }
    console.log('[BACKEND] Session valid for:', user.email);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ 
      loggedIn: true,
      user: {
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('[BACKEND] Token verification failed:', err);
    res.status(200).json({ loggedIn: false });
  }
};
//end
const logOut = (req: Request, res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
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
  verifySession,
  forgotPassword,
  verifyResetToken,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
};
