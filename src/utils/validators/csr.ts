import forge from "node-forge";
import acme from "acme-client";

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

const formatCSRPemString = async (pemString: string) => {
  const cleanPem = pemString
    .replace(/-----BEGIN CERTIFICATE REQUEST-----/g, "")
    .replace(/-----END CERTIFICATE REQUEST-----/g, "")
    .replace(/\s+/g, "");
  const chunks = cleanPem.match(/.{1,64}/g);
  const formattedPem = chunks?.join("\n");
  return `-----BEGIN CERTIFICATE REQUEST-----\n${formattedPem}\n-----END CERTIFICATE REQUEST-----`;
};

const formatSSLPemString = async (pemString: string) => {
  const cleanPem = pemString
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const chunks = cleanPem.match(/.{1,64}/g);
  const formattedPem = chunks?.join("\n");
  return `-----BEGIN CERTIFICATE-----\n${formattedPem}\n-----END CERTIFICATE-----`;
};

export {
  validateCsrCertificate,
  generateCsrCertificate,
  formatCSRPemString,
  formatSSLPemString,
};
