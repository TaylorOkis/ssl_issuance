import { CustomRequest } from "@/types/types";
import getSessionData from "@/utils/session/session";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import {
  validateCsrCertificate,
  generateCsrCertificate,
} from "@/utils/validators/csr";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

const validateCSR = async (req: CustomRequest, res: Response) => {
  const session = await getSessionData(req.session.id);

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  let sessionData;
  try {
    sessionData = JSON.parse(session.data).userDataInput;
  } catch (error) {
    throw new BadRequestError("Session Data is corrupted");
  }

  const csrCertificate = sessionData.csrCertificate;

  switch (sessionData.autoGenerateCsr) {
    case false:
      if (!csrCertificate) {
        throw new BadRequestError(
          "Csr certificate field must not be empty when auto generate is false"
        );
      }
      const isCsrValid = validateCsrCertificate(
        csrCertificate,
        sessionData.domain
      );
      if (!isCsrValid) {
        throw new BadRequestError("CSR certificate is not Valid");
      }
      res.status(StatusCodes.SEE_OTHER).redirect("/domain/get-challenge");
      return;

    case true:
      const newCsrCertificate = await generateCsrCertificate(
        sessionData.domain,
        sessionData.subDomain,
        sessionData.keySize
      );

      if (!newCsrCertificate) {
        throw new Error("An error occured while generating new csr");
      }

      (req.session as any).newCsrCertificate = {
        key: newCsrCertificate.key,
        certificate: newCsrCertificate.certificate,
      } as any;

      req.session.save();

      res.status(StatusCodes.SEE_OTHER).redirect("/domain/get-challenge");
      return;

    default:
      throw new BadRequestError(
        "Invalid CSR value. It has to be true or false"
      );
  }
};

export default validateCSR;
