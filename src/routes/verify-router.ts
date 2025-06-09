import express from "express";
import sessionMiddleWare from "@/middlewares/session.js";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication.js";
import verifyDomainChallenge from "@/controllers/verify-domain-challenge-controller.js";

const verifyRouter = express.Router();

verifyRouter.post(
  "/verify-domain",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  verifyDomainChallenge
);

export default verifyRouter;
