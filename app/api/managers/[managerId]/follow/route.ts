import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { auth } from "../../../../../src/lib/auth";

// Toggle "Notify me about new reviews" for a manager. Account-only: the whole
// point is to email the address you signed in with, so an anonymous visitor has
// nowhere for the alerts to go.
export async function POST(request: Request, { params }: { params: Promise<{ managerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to get notified." }, { status: 401 });
  }

  const { managerId } = await params;
  const userId = session.user.id;

  try {
    const manager = await prisma.manager.findUnique({ where: { id: managerId }, select: { id: true } });
    if (!manager) {
      return NextResponse.json({ error: "Manager not found." }, { status: 404 });
    }

    const existing = await prisma.managerFollow.findUnique({
      where: { userId_managerId: { userId, managerId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.managerFollow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    }

    await prisma.managerFollow.create({ data: { userId, managerId } });
    return NextResponse.json({ following: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update notifications." },
      { status: 400 },
    );
  }
}
