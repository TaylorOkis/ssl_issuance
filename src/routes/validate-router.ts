import express from "express";
import validateEmailAndDomain from "@/controllers/validate-email-controller";
import sessionMiddleWare from "@/middlewares/session";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication";
import validateCSR from "@/controllers/validate-csr-controller";

const validateRouter = express.Router();

validateRouter.post(
  "/email-and-domain",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  validateEmailAndDomain
);
validateRouter.get(
  "/csr",
  authenticateUser,
  checkUserHasAcmeAccount,
  sessionMiddleWare,
  validateCSR
);

export default validateRouter;
