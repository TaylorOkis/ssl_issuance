import { verifyToken } from "@/utils/auth/jwt";
import { UnauthorizedError, UnauthenticatedError } from "@/utils/errors";
import { Request, Response, NextFunction } from "express";
import { Payload, CustomRequest } from "@/types/types";

const authenticateUser = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.signedCookies.accessToken;

  if (!token) {
    throw new UnauthenticatedError("Authentication Failed");
  }

  try {
    const payload = verifyToken({ token: token }) as Payload;
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    };
    next();
  } catch (error) {
    throw new UnauthenticatedError("Authentication Failed");
  }
};

export default authenticateUser;
