import { siteUrl } from "./seo";

const REPORT_NOTIFICATION_EMAIL = "sharkawykyrillos@gmail.com";

export async function sendReportNotification(report: {
  reportId: string;
  reason: string;
  details?: string;
  managerName: string;
  company: string;
  profilePath: string;
  reviewText: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping report email notification.");
    return;
  }

  const from = process.env.REPORT_NOTIFICATION_FROM || "ManagerScore <onboarding@resend.dev>";
  const url = `${siteUrl()}${report.profilePath}`;

  const text = [
    `A new review report was submitted on ManagerScore.`,
    ``,
    `Manager: ${report.managerName} (${report.company})`,
    `Profile: ${url}`,
    `Reason: ${report.reason}`,
    report.details ? `Details: ${report.details}` : null,
    ``,
    `Reported review text:`,
    `"${report.reviewText}"`,
    ``,
    `Report ID: ${report.reportId}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: REPORT_NOTIFICATION_EMAIL,
        subject: `[ManagerScore] Review report: ${report.managerName} at ${report.company}`,
        text,
      }),
    });

    if (!res.ok) {
      console.error("Failed to send report notification email:", res.status, await res.text());
    }
  } catch (error) {
    console.error("Failed to send report notification email:", error);
  }
}
