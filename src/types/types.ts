import { Request } from "express";

interface Payload {
  id: string;
  name: string;
  email: string;
}

interface CustomRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface CertificateRequest {
  domain: string;
  subDomain: Array<string>;
  email: string;
  autoGenerateCsr: Boolean;
  csrCertificate: string;
  challenge: string;
  keySize: number;
}

export { Payload, CustomRequest, CertificateRequest };
