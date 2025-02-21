import jwt from "jsonwebtoken";
import { Response } from "express";

interface Payload {
  id: String;
  name: String;
  email: String;
}

const generateToken = ({ payload }: { payload: Payload }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
  return token;
};

const verifyToken = ({ token }: { token: string }) => {
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
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + threeDays),
    signed: true,
  });
};

export { verifyToken, attachCookieToResponse };
