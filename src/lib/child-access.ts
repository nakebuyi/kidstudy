import { prisma } from "./prisma";

type MaybeSession = { user?: { id?: string | null } } | null;

/**
 * Return the Child record the current session is authorized to access, or
 * `null` when the session may not act on `childId`.
 *
 * - Parent sessions: `session.user.id` is the Parent id; the child must belong
 *   to the parent (`parentId === session.user.id`).
 * - Child sessions: `session.user.id` is the ChildAccount id; a child may only
 *   ever act on their own Child record, carried in `session.currentChildId`.
 */
export async function getAuthorizedChild(
  session: MaybeSession,
  childId: string
) {
  if (!session?.user?.id) return null;
  const role = (session as any)?.role as string | undefined;

  if (role === "child") {
    if ((session as any).currentChildId !== childId) return null;
    return prisma.child.findUnique({ where: { id: childId } });
  }

  return prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
}
