import express from "express";
import sessionMiddleWare from "@/middlewares/session";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication";
import verifyDomainChallenge from "@/controllers/verify-domain-challenge-controller";

const verifyRouter = express.Router();

verifyRouter.post(
  "/verify-domain",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  verifyDomainChallenge
);

export default verifyRouter;
