import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ managers: [] });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ managers: [] });
  }

  try {
    const managers = await prisma.manager.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { department: { contains: q, mode: "insensitive" } },
          { company: { name: { contains: q, mode: "insensitive" } } },
        ],
        reviews: { some: { status: "APPROVED" } },
      },
      take: 12,
      include: {
        company: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { overall: true, wouldAgain: true },
        },
      },
    });

    return NextResponse.json({
      managers: managers.map((manager) => {
        const reviewCount = manager.reviews.length;
        const averageScore =
          reviewCount > 0
            ? manager.reviews.reduce((sum, review) => sum + review.overall, 0) / reviewCount
            : 0;

        return {
          id: manager.id,
          name: manager.name,
          title: manager.title,
          department: manager.department,
          company: manager.company.name,
          reviewCount,
          averageScore,
        };
      }),
    });
  } catch {
    return NextResponse.json({ managers: [] });
  }
}
