import acme from "acme-client";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

import db from "@/database/db";
import getSessionData from "@/utils/session/session";
import DIRECTORY_URL from "@/utils/constants/constants";
import { CustomRequest } from "@/types/types";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { generateCertificate, getSSLData } from "@/services/acme-services";

const generateSSLCertificate = async (req: CustomRequest, res: Response) => {
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
    sessionData = JSON.parse(session.data);
  } catch (error) {
    throw new BadRequestError("Session Data is corrupted");
  }

  const challenges = sessionData.sslData.challenges;
  const order = sessionData.sslData.order;

  const sslCertificate = await generateCertificate(client, order, challenges);

  const result =
    sessionData.userDataInput.autoGenerateCsr === true
      ? getSSLData(
          sessionData.userDataInput.csrCertificate,
          sessionData.csrKey.key,
          sslCertificate
        )
      : { sslCertificate: sslCertificate.replace(/\n/g, "") };

  // TODO: storeCertificateInDB(csr, privateKey, sslCertificate, domain, subDomain);

  req.session.destroy((err) => {
    if (err) {
      throw new Error("An error occured while destroying session data");
    }
    res.clearCookie("connect.sid");
    res.status(StatusCodes.OK).json({ status: "success", data: result });
  });
};

export default generateSSLCertificate;
