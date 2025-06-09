import express from "express";
import validateEmailAndDomain from "@/controllers/validate-email-controller.js";
import sessionMiddleWare from "@/middlewares/session.js";
import {
  authenticateUser,
  checkUserHasAcmeAccount,
} from "@/middlewares/authentication.js";
import validateCSR from "@/controllers/validate-csr-controller.js";

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
