import express from "express";
import sessionMiddleWare from "@/middlewares/session";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication";
import generateSSLCertificate from "@/controllers/generate-ssl-certificate";
import revokeSSLCertificate from "@/controllers/revoke-ssl-controller";

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
