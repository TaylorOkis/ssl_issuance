import express from "express";

const authRouter = express.Router();

authRouter.post("/register");
authRouter.post("/login");
authRouter.get("/logout");

export default authRouter;
