import jwt from "jsonwebtoken";
import { Response } from "express";
import { Payload } from "@/types/types";
import { UnauthenticatedError } from "../errors";

const generateToken = ({ payload }: { payload: Payload }) => {
  console.log('JWT_SECRET during signing:', process.env.JWT_SECRET?.substring(0, 5) + '...');
  if (!process.env.JWT_SECRET) {
    throw new UnauthenticatedError(
      "Missing JWT variable in environment variables"
    );
  }
  if (!process.env.JWT_LIFETIME) {
    throw new UnauthenticatedError(
      "Missing JWT variable in environment variables"
    );
  }
  const token = jwt.sign(payload!, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME as any,
  });
  return token;
};

const verifyToken = ({ token }: { token: string }) => {
  console.log('JWT_SECRET during verify:', process.env.JWT_SECRET?.substring(0, 5) + '...');
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

const attachCookieToResponse = ({
  res,
  user,
}: {
  res: Response;
  user: Payload;
}) => {
  const accessToken = generateToken({ payload: user });

  const threeDays = 1000 * 60 * 60 * 72;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'strict',
  signed: true,
  maxAge: threeDays// 1 day
  });
};

export { verifyToken, attachCookieToResponse,generateToken };