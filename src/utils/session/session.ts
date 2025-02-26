import db from "@/database/db";

const getSessionData = async (sessionId: string) => {
  return await db.session.findUnique({
    where: { id: sessionId },
  });
};

export default getSessionData;
