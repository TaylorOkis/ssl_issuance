import db from "@/database/db";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";

const sessionMiddleWare = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(db, {
    checkPeriod: 2 * 60 * 1000, // Cleanup expired sessions in 2 minutes
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // expires in 1 day
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: 'lax',
  },
});

export default sessionMiddleWare;
