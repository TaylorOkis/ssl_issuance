import express from "express";
import sessionMiddleWare from "@/middlewares/session";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication";
import getDomainChallenge from "@/controllers/get-domain-challenge-controller";

const domainRouter = express.Router();

domainRouter.get(
  "/get-challenge",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  getDomainChallenge
);

export default domainRouter;
