import { CustomRequest } from "@/types/types";
import getSessionData from "@/utils/session/session";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import {
  validateCsrCertificate,
  generateCsrCertificate,
  formatCSRPemString,
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

      (req.session as any).userDataInput = {
        ...(req.session as any).userDataInput,
        csrCertificate: formatCSRPemString(csrCertificate),
      } as any;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject("An error occurred while saving session data");
          resolve();
        });
      });

      res.status(StatusCodes.SEE_OTHER).redirect("/domain/get-challenge");
      break;

    case true:
      const newCsrCertificate = await generateCsrCertificate(
        sessionData.domain,
        sessionData.subDomain,
        sessionData.keySize
      );

      if (!newCsrCertificate) {
        throw new Error("An error occured while generating new csr");
      }

      (req.session as any).csrKey = {
        key: newCsrCertificate.key,
      } as any;

      (req.session as any).userDataInput = {
        ...(req.session as any).userDataInput,
        csrCertificate: newCsrCertificate.certificate,
      } as any;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject("An error occurred while saving session data");
          resolve();
        });
      });
      res.status(StatusCodes.SEE_OTHER).redirect("/domain/get-challenge");
      break;

    default:
      throw new BadRequestError(
        "Invalid CSR value. It has to be true or false"
      );
  }
};

export default validateCSR;
