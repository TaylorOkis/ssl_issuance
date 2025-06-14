import { Response } from "express";
import validateDomainAndEmail from "@/utils/validators/domain-and-email.js";
import { CustomRequest } from "@/types/types.js";
import { BadRequestError } from "@/utils/errors/index.js";
import { StatusCodes } from "http-status-codes";

const validateEmailAndDomain = async (req: CustomRequest, res: Response) => {
  const {
    domain,
    subDomain,
    email,
    autoGenerateCsr,
    csrCertificate,
    challenge,
    keySize,
  } = req.body;

  const subdomain = subDomain.split(", ");

  if (
    !validateDomainAndEmail({
      domain: domain,
      subDomain: subdomain,
      email: email,
    })
  ) {
    if (req.session) {
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (destroyError) {
        throw new Error("Session destruction failed");
      }
    }
    throw new BadRequestError("Check that domains and email is valid");
  }

  (req.session as any).userDataInput = {
    domain,
    subDomain: subdomain,
    email,
    autoGenerateCsr,
    csrCertificate,
    challenge,
    keySize,
  } as any;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject("An error occurred while saving session data");
      resolve();
    });
  });

  res.status(StatusCodes.SEE_OTHER).redirect("/validate/csr");
  return;
};

export default validateEmailAndDomain;
