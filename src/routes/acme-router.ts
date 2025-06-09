import express from "express";
import {
  checkAcmeAccount,
  creatAcmeAccount,
  deleteAcmeAccount,
} from "@/controllers/acme-account-controller.js";
import { authenticateUser } from "@/middlewares/authentication.js";

const acmeRouter = express.Router();

acmeRouter.get("/status", authenticateUser, checkAcmeAccount);
acmeRouter.post("/create-acme-account", authenticateUser, creatAcmeAccount);
acmeRouter.delete("/delete-acme-account", authenticateUser, deleteAcmeAccount);

export default acmeRouter;
