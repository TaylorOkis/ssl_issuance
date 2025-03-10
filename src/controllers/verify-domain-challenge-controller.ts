import acme from "acme-client";
import { Response } from "express";

import db from "@/database/db";
import { DIRECTORY_URL } from "@/utils/constants/constants";
import getSessionData from "@/utils/session/session";
import { CustomRequest } from "@/types/types";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { StatusCodes } from "http-status-codes";
import { verifyChallenges } from "@/services/acme-services";
import executeWithTimeout from "@/utils/timeout/execute-with-timeout";

const verifyDomainChallenge = async (req: CustomRequest, res: Response) => {
  const { id: userId } = req.user!;
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { accountKey: true, accountUrl: true },
  });

  if (!existingUser) {
    throw new NotFoundError("Acme account does not exist for user");
  }

  const session = await getSessionData(req.session.id);

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  const client = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey: existingUser.accountKey!,
    accountUrl: existingUser.accountUrl!,
  });

  let sessionData;
  try {
    sessionData = JSON.parse(session.data).sslData;
  } catch (error) {
    throw new BadRequestError("Session Data is corrupted");
  }

  const challenges = sessionData.challenges;

  try {
    await executeWithTimeout(verifyChallenges(client, challenges), 300000);
  } catch (error: any) {
    throw new Error(error.message);
  }

  res.status(StatusCodes.SEE_OTHER).redirect("/ssl/generate-ssl");
};

export default verifyDomainChallenge;
