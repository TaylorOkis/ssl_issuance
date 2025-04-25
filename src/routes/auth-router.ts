import express from "express";
import {
  register,
  login,
  logOut,
  verifySession,
  forgotPassword,
  verifyResetToken,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
} from "@/controllers/auth-controller";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/logout", logOut);
authRouter.get("/verify-session", verifySession);
authRouter.post("/forgot-password", forgotPassword);
authRouter.get("/verify-reset-token", verifyResetToken);
authRouter.post("/change-password", changePassword);
authRouter.post("/send-verification-email", sendVerificationEmail);
authRouter.get("/verify-email", verifyEmail);

export default authRouter;
