// error-middleware.ts
import { Request, Response, NextFunction } from "express";

export const handleJWTErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.message.includes("Invalid payload")) {
    return res.status(400).json({ 
      status: "fail",
      error: "Authentication data malformed" 
    });
  }
  next(err);
};

// Add to your app.ts/index.ts:
