import cron from "node-cron";
import db from "../../database/db.js";

cron.schedule("*/15 * * * *", async () => {
  try {
    await db.user.updateMany({
      where: {
        resetTokenExpiry: { lte: new Date() },
      },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await db.user.updateMany({
      where: {
        verificationTokenExpiry: { lte: new Date() },
      },
      data: {
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
  } catch (error) {
    throw new Error("An error occurred while trying to delete expired tokens");
  }
});
