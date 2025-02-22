import { Request, Response } from "express";
// import { createPrivateKey } from "crypto";
import acme from "acme-client";
import { StatusCodes } from "http-status-codes";
import db from "@/database/db";
import { CustomRequest } from "@/types/types";
import { BadRequestError, NotFoundError } from "@/utils/errors";

const DIRECTORY_URL = acme.directory.letsencrypt.staging;

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

  // TODO: ENCRYPT PRIVATE KEY.

  const client = new acme.Client({
    directoryUrl: DIRECTORY_URL!,
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

  const client = new acme.Client({
    directoryUrl: DIRECTORY_URL!,
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
