import forge from "node-forge";
import acme from "acme-client";
import { Certificate } from "crypto";
import { CertificateRequest } from "@/types/types";

const validateCsrCertificate = (csrCertificate: string, domain: string) => {
  try {
    const csr = forge.pki.certificationRequestFromPem(csrCertificate);
    if (csr.verify()) {
      const commonName = csr.subject.attributes.find(
        (attr) => attr.name === "commonName"
      );
      return commonName?.value === domain;
    }
    return false;
  } catch {
    return false;
  }
};

const generateCsrCertificate = async (
  domain: string,
  subDomain: Array<string>,
  keySize: number
) => {
  const [key, certificate] = await acme.crypto.createCsr({
    commonName: domain,
    altNames: subDomain,
    keySize: keySize,
  });

  return {
    key: key,
    certificate: certificate,
  };
};

export { validateCsrCertificate, generateCsrCertificate };
