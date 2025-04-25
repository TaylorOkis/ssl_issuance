import express from "express";
import {
  creatAcmeAccount,
  deleteAcmeAccount,
  checkAcmeAccount,
} from "@/controllers/acme-account-controller";
import { authenticateUser , checkUserHasAcmeAccount} from "@/middlewares/authentication";

const acmeRouter = express.Router();

acmeRouter.post("/create-acme-account", authenticateUser, creatAcmeAccount);
acmeRouter.delete("/delete-acme-account", authenticateUser, deleteAcmeAccount);
//added by zuby
acmeRouter.get("/status", authenticateUser,  checkUserHasAcmeAccount);

export default acmeRouter;
