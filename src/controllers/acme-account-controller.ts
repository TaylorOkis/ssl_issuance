import acme from "acme-client";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

import db from "@/database/db";
import { CustomRequest } from "@/types/types";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { DIRECTORY_URL } from "@/utils/constants/constants";

const creatAcmeAccount = async (req: CustomRequest, res: Response) => {
  const { email } = req.user!;

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, accountKey: true, accountUrl: true },
  });

  if (!existingUser) {
    throw new NotFoundError("User does not Exists");
  }

  if (existingUser.accountKey || existingUser.accountUrl) {
    throw new BadRequestError("Acme account already exists");
  }

  const privateKey = await acme.crypto.createPrivateKey();

  // TODO: POSSIBLY ENCRYPT PRIVATE KEY.

  const client = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey: privateKey,
  });

  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${email}`],
  });

  await db.user.update({
    where: { id: existingUser.id },
    data: {
      accountKey: privateKey.toString(),
      accountUrl: client.getAccountUrl(),
    },
  });

  res
    .status(StatusCodes.CREATED)
    .json({ status: "success", message: "ACME account created successfully" });
};

const deleteAcmeAccount = async (req: CustomRequest, res: Response) => {
  const { email } = req.user!;

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, accountKey: true, accountUrl: true },
  });

  if (!existingUser) {
    throw new NotFoundError("User does not Exists");
  }

  if (!existingUser.accountKey || existingUser.accountUrl) {
    throw new BadRequestError("Acme Account does not exist");
  }

  const client = new acme.Client({
    directoryUrl: process.env.DIRECTORY_URL!,
    accountKey: existingUser.accountKey!,
    accountUrl: existingUser.accountUrl!,
  });

  await client.updateAccount({
    status: "deactivated",
  });

  await db.user.update({
    where: { id: existingUser.id },
    data: { accountKey: null, accountUrl: null },
  });

  res
    .status(StatusCodes.OK)
    .json({ status: "success", message: "ACME account deleted successfully" });
};
//added byzuby
const checkAcmeAccount = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return; 
    }
    
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: { accountKey: true, accountUrl: true }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    console.log(`ACME Status for ${req.user.id}:`, { 
      hasAccount: !!(user.accountKey && user.accountUrl),
      accountKeyExists: !!user.accountKey,
      accountUrlExists: !!user.accountUrl
    });

    res.status(200).json({
      hasAccount: !!(user.accountKey && user.accountUrl),
      accountUrl: user.accountUrl || null
    });
    
  } catch (error) {
    console.error("Error checking ACME account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export { creatAcmeAccount, deleteAcmeAccount, checkAcmeAccount };