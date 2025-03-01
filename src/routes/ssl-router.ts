import express from "express";
import sessionMiddleWare from "@/middlewares/session";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication";
import generateSSLCertificate from "@/controllers/generate-ssl-certificate";

const generateSSLRouter = express.Router();

generateSSLRouter.get(
  "/ssl",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  generateSSLCertificate
);

export default generateSSLRouter;
