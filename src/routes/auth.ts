import express from "express";
import { register, login, logOut } from "@/controllers/auth";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/logout", logOut);

export default authRouter;
