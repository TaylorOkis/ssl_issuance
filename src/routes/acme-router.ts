import express from "express";
import {
  creatAcmeAccount,
  deleteAcmeAccount,
} from "@/controllers/acme-controller";
import authenticateUser from "@/middlewares/authentication";

const acmeRouter = express.Router();

acmeRouter.post("/create-acme-account", authenticateUser, creatAcmeAccount);
acmeRouter.delete("/delete-acme-account", authenticateUser, deleteAcmeAccount);

export default acmeRouter;
