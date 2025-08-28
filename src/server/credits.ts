// src/server/credits.ts
import { HttpError } from "wasp/server";

/**
 * Kullanıcının kredisi > 0 ise atomik olarak 1 düşer.
 * Kredisi yoksa 402 fırlatır. Auth yoksa 401 fırlatır.
 */
export const spendCredit = async (_args: void, context: any) => {
  if (!context.user?.id) {
    throw new HttpError(401, "UNAUTHENTICATED");
  }

  const res = await context.entities.User.updateMany({
    where: { id: context.user.id, credits: { gt: 0 } },
    data: { credits: { decrement: 1 } },
  });

  if (res.count === 0) {
    throw new HttpError(402, "NO_CREDITS");
  }

  // Kalan kredi dönmek için :
  // const me = await context.entities.User.findUnique({ where: { id: context.user.id }, select: { credits: true }});
  // return me?.credits ?? 0;
};
