import acme from "acme-client";

import db from "@/database/db";
import {
  DIRECTORY_URL,
  VALID_REVOCATION_REASONS,
} from "@/utils/constants/constants";
import { CustomRequest } from "@/types/types";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { revokeSSL } from "@/services/acme-services";
import { formatSSLPemString } from "@/utils/validators/csr";

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
