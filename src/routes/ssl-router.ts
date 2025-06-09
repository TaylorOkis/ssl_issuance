import express from "express";
import sessionMiddleWare from "@/middlewares/session.js";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication.js";
import generateSSLCertificate from "@/controllers/generate-ssl-certificate.js";
import revokeSSLCertificate from "@/controllers/revoke-ssl-controller.js";

const sslRouter = express.Router();

sslRouter.get(
  "/generate-ssl",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  generateSSLCertificate
);

sslRouter.post(
  "/revoke-ssl",
  authenticateUser,
  checkUserHasAcmeAccount,
  revokeSSLCertificate
);

export default sslRouter;
