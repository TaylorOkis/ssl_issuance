import db from "@/database/db.js";
import acme from "acme-client";
import { CustomRequest } from "@/types/types.js";
import { BadRequestError, NotFoundError } from "@/utils/errors/index.js";
import { Response } from "express";
import getSessionData from "@/utils/session/session.js";
import { setupChallenges } from "@/services/acme-services.js";
import { StatusCodes } from "http-status-codes";
import { DIRECTORY_URL } from "@/utils/constants/constants.js";

const getDomainChallenge = async (req: CustomRequest, res: Response) => {
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
    sessionData = JSON.parse(session.data).userDataInput;
  } catch (error) {
    throw new BadRequestError("Session Data is corrupted");
  }

  const challenge = await setupChallenges(
    req,
    client,
    [sessionData.domain, ...sessionData.subDomain],
    sessionData.challenge
  );

  res
    .status(StatusCodes.OK)
    .json({ status: "success", data: { challenges: challenge } });
};

export default getDomainChallenge;
