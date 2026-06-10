import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { hashRequestIp } from "../../../src/lib/reviews";
import { sendReportNotification } from "../../../src/lib/notify";
import { managerPath } from "../../../src/lib/seo";

export const REPORT_REASONS = [
  "This review isn't about me / wrong manager",
  "False or misleading",
  "Contains private or identifying information",
  "Harassment, hate speech, or threats",
  "Spam or fake review",
  "Other",
] as const;

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const reviewId = typeof body?.reviewId === "string" ? body.reviewId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const details =
      typeof body?.details === "string" && body.details.trim()
        ? body.details.trim().slice(0, 2000)
        : undefined;

    if (!reviewId) {
      return NextResponse.json({ error: "Missing review." }, { status: 400 });
    }
    if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
      return NextResponse.json({ error: "Please choose a valid reason." }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { manager: { include: { company: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const reporterIpHash = hashRequestIp(request);

    if (reporterIpHash) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentReports = await prisma.reviewReport.count({
        where: { reporterIpHash, createdAt: { gte: oneHourAgo } },
      });
      if (recentReports >= 5) {
        return NextResponse.json(
          { error: "Too many reports submitted recently. Please try again later." },
          { status: 429 },
        );
      }
    }

    const report = await prisma.reviewReport.create({
      data: { reviewId, reason, details, reporterIpHash },
    });

    await sendReportNotification({
      reportId: report.id,
      reason,
      details,
      managerName: review.manager.name,
      company: review.manager.company.name,
      profilePath: managerPath(review.manager.company.slug, review.manager.slug),
      reviewText: review.reviewText,
    });

    return NextResponse.json({ message: "Report submitted. Thank you." }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit report." },
      { status: 400 },
    );
  }
}
