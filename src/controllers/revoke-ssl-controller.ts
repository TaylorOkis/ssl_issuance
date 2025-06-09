import acme from "acme-client";

import db from "@/database/db.js";
import {
  DIRECTORY_URL,
  VALID_REVOCATION_REASONS,
} from "@/utils/constants/constants.js";
import { CustomRequest } from "@/types/types.js";
import { BadRequestError, NotFoundError } from "@/utils/errors/index.js";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { revokeSSL } from "@/services/acme-services.js";
import { formatSSLPemString } from "@/utils/validators/csr.js";

const revokeSSLCertificate = async (req: CustomRequest, res: Response) => {
  const { id: userId } = req.user!;
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { accountKey: true, accountUrl: true },
  });

  if (!existingUser) {
    throw new NotFoundError("Acme account does not exist for user");
  }

  const { ssl, reason = 0 } = req.body;

  if (!ssl) {
    throw new BadRequestError(
      "SSL Certificate not found. Please provide an SSL certificate"
    );
  }

  if (!VALID_REVOCATION_REASONS.has(reason)) {
    throw new BadRequestError(`Invalid revocation reason: ${reason}`);
  }

  const client = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey: existingUser.accountKey!,
    accountUrl: existingUser.accountUrl!,
  });

  const sslPem = formatSSLPemString(ssl);

  const result = await revokeSSL(client, sslPem, reason);

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "SSL CERTIFICATE REVOKED SUCCESSFULLY",
    data: result,
  });
};

export default revokeSSLCertificate;
