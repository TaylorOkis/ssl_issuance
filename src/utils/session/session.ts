import db from "@/database/db.js";

const getSessionData = async (sessionId: string) => {
  return await db.session.findUnique({
    where: { id: sessionId },
  });
};

export default getSessionData;
