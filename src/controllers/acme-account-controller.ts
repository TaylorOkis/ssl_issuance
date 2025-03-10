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

export { creatAcmeAccount, deleteAcmeAccount };
