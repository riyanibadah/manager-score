import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";

type ReportRouteProps = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, { params }: ReportRouteProps) {
  try {
    await requireAdmin(await headers());
    const { reportId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === "string" ? body.status.toUpperCase() : "DISMISSED";

    if (!["OPEN", "REVIEWED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid report status." }, { status: 400 });
    }

    await prisma.reviewReport.update({
      where: { id: reportId },
      data: { status: status as "OPEN" | "REVIEWED" | "DISMISSED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update report." },
      { status: 400 },
    );
  }
}
