import express from "express";
import sessionMiddleWare from "@/middlewares/session.js";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication.js";
import getDomainChallenge from "@/controllers/get-domain-challenge-controller.js";

const domainRouter = express.Router();

domainRouter.get(
  "/get-challenge",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  getDomainChallenge
);

export default domainRouter;
