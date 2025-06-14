import { verifyToken } from "@/utils/auth/jwt.js";
import {
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/utils/errors/index.js";
import { Response, NextFunction } from "express";
import { Payload, CustomRequest } from "@/types/types.js";
import db from "@/database/db.js";

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

const checkUserHasAcmeAccount = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const { id: userId } = req.user!;

  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { accountKey: true, accountUrl: true },
  });

  if (!existingUser) {
    throw new NotFoundError("User does not Exists");
  }

  if (!existingUser.accountKey || !existingUser.accountUrl) {
    throw new UnauthorizedError("Acme account is needed to proceed");
  }

  next();
};

export { authenticateUser, checkUserHasAcmeAccount };
