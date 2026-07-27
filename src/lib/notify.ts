import { siteUrl } from "./seo";
import { escapeHtml } from "./html";

const REPORT_NOTIFICATION_EMAIL = "sharkawykyrillos@gmail.com";

function senderAddress() {
  return process.env.REPORT_NOTIFICATION_FROM || "ManagerScore <onboarding@resend.dev>";
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping email to", to);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Always send the plain-text part alongside the HTML: it's the fallback
      // for text-only clients and it measurably helps deliverability.
      body: JSON.stringify({ from: senderAddress(), to, subject, text, ...(html ? { html } : {}) }),
    });

    if (!res.ok) {
      console.error("Failed to send email:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Table-based layout with fully inline styles — the only thing that renders
 * consistently across Gmail, Outlook and Apple Mail, none of which support
 * external stylesheets or modern layout.
 */
export function renderEmail({
  preheader,
  heading,
  intro,
  quote,
  ctaLabel,
  ctaUrl,
  footnote,
  footerLinkUrl,
  footerLinkLabel,
}: {
  preheader: string;
  heading: string;
  intro: string;
  /** Verbatim content. Moderation mail only — never in subscriber alerts. */
  quote?: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
  footerLinkUrl?: string;
  footerLinkLabel?: string;
}) {
  const safeCta = escapeHtml(ctaUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e8ebf3;border-radius:16px;">
        <tr>
          <td style="padding:30px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:800;color:#080b1a;letter-spacing:-0.2px;">
            Manager<span style="color:#5b2df5;">Score</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
            <h1 style="margin:0 0 10px;font-size:21px;line-height:1.35;font-weight:800;color:#080b1a;">${escapeHtml(heading)}</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:#58647a;">${escapeHtml(intro)}</p>
          </td>
        </tr>
        ${
          quote
            ? `<tr>
          <td style="padding:18px 32px 0;">
            <div style="padding:14px 16px;border-left:3px solid #e8ebf3;background-color:#f8fafc;border-radius:0 8px 8px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#334155;white-space:pre-line;">${escapeHtml(quote)}</div>
          </td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:26px 32px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#5b2df5;border-radius:10px;">
                  <a href="${safeCta}" style="display:inline-block;padding:14px 28px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          footnote
            ? `<tr>
          <td style="padding:22px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#94a3b8;">
            ${escapeHtml(footnote)}
          </td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:24px 32px 30px;">
            <div style="border-top:1px solid #e8ebf3;padding-top:16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;">
              Anonymous manager reviews at <a href="${escapeHtml(siteUrl())}" style="color:#94a3b8;text-decoration:underline;">ManagerScore</a>.${
                footerLinkUrl
                  ? ` <a href="${escapeHtml(footerLinkUrl)}" style="color:#94a3b8;text-decoration:underline;">${escapeHtml(footerLinkLabel || "Unsubscribe")}</a>.`
                  : ""
              }
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Double opt-in: nothing is ever delivered to an address until the owner clicks
 * the confirm link, so a subscription can't be used to mail-bomb someone else.
 */
export async function sendSubscriptionConfirmation(subscription: {
  email: string;
  confirmToken: string;
  managerName: string;
  company: string;
  reviewUrl: string;
}) {
  const confirmUrl = `${siteUrl()}/api/notifications/confirm?token=${encodeURIComponent(subscription.confirmToken)}`;
  const intro = `You asked to be emailed when someone replies to a review of ${subscription.managerName} at ${subscription.company}. Confirm your address to switch alerts on.`;
  const footnote = "If you didn't request this, just ignore this email — no alerts will ever be sent unless the button above is used.";

  return sendEmail({
    to: subscription.email,
    subject: `Confirm reply alerts for ${subscription.managerName} at ${subscription.company}`,
    text: [intro, ``, `Confirm your email:`, confirmUrl, ``, footnote].join("\n"),
    html: renderEmail({
      preheader: "Confirm your email to start getting reply alerts.",
      heading: "Confirm your email",
      intro,
      ctaLabel: "Confirm my email",
      ctaUrl: confirmUrl,
      footnote,
    }),
  });
}

/**
 * Carries no content from the reply itself — not the body, and not the
 * author's self-chosen label, which is free text a reply author could use to
 * push whatever they liked into a stranger's inbox. The reply also lives
 * behind the unlock gate and can be moderated away, which an email copy would
 * outlive. The alert only says that something new is there.
 */
export async function sendReplyNotification(notification: {
  email: string;
  unsubscribeToken: string;
  managerName: string;
  company: string;
  replyUrl: string;
}) {
  const unsubscribeUrl = `${siteUrl()}/api/notifications/unsubscribe?token=${encodeURIComponent(notification.unsubscribeToken)}`;
  const intro = `Someone replied to a review you're following of ${notification.managerName} at ${notification.company}. Open it to read the reply in the thread.`;

  return sendEmail({
    to: notification.email,
    subject: `New reply on the review of ${notification.managerName} at ${notification.company}`,
    text: [
      intro,
      ``,
      `Read the reply: ${notification.replyUrl}`,
      ``,
      `Stop receiving alerts for this review: ${unsubscribeUrl}`,
    ].join("\n"),
    html: renderEmail({
      preheader: `New reply on the review of ${notification.managerName}.`,
      heading: "Someone replied",
      intro,
      ctaLabel: "Read the reply",
      ctaUrl: notification.replyUrl,
      footerLinkUrl: unsubscribeUrl,
      footerLinkLabel: "Unsubscribe from this review",
    }),
  });
}

/**
 * Moderation heads-up, sent only to the site owner. Like the subscriber alert
 * it carries no reply text: the point of the mail is to get someone onto the
 * thread, and a full copy in the inbox removes any reason to open it.
 */
export async function sendReplyModerationNotice(reply: {
  replyId: string;
  managerName: string;
  company: string;
  profilePath: string;
}) {
  const replyUrl = `${siteUrl()}${reply.profilePath}#reply-${reply.replyId}`;
  const intro = `A new reply was posted on the review of ${reply.managerName} at ${reply.company}.`;

  return sendEmail({
    to: REPORT_NOTIFICATION_EMAIL,
    subject: `[ManagerScore] New reply: ${reply.managerName} at ${reply.company}`,
    text: [intro, ``, `Open it: ${replyUrl}`, ``, `Reply ID: ${reply.replyId}`].join("\n"),
    html: renderEmail({
      preheader: intro,
      heading: "New reply posted",
      intro,
      ctaLabel: "Open the reply",
      ctaUrl: replyUrl,
      footnote: `Reply ID: ${reply.replyId}`,
    }),
  });
}

export async function sendReportNotification(report: {
  reportId: string;
  reason: string;
  details?: string;
  managerName: string;
  company: string;
  profilePath: string;
  reviewText: string;
  target?: "review" | "reply";
}) {
  const url = `${siteUrl()}${report.profilePath}`;
  const target = report.target === "reply" ? "reply" : "review";
  const intro = `A ${target} on ${report.managerName} at ${report.company} was reported for: ${report.reason}${
    report.details ? ` — "${report.details}"` : ""
  }`;

  return sendEmail({
    to: REPORT_NOTIFICATION_EMAIL,
    subject: `[ManagerScore] ${target === "reply" ? "Reply" : "Review"} report: ${report.managerName} at ${report.company}`,
    text: [
      `A new ${target} report was submitted on ManagerScore.`,
      ``,
      `Manager: ${report.managerName} (${report.company})`,
      `Profile: ${url}`,
      `Reason: ${report.reason}`,
      report.details ? `Details: ${report.details}` : null,
      ``,
      `Reported ${target} text:`,
      `"${report.reviewText}"`,
      ``,
      `Report ID: ${report.reportId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmail({
      preheader: `${target} reported: ${report.reason}`,
      heading: `Reported ${target}`,
      intro,
      quote: report.reviewText,
      ctaLabel: "Open the profile",
      ctaUrl: url,
      footnote: `Report ID: ${report.reportId}`,
    }),
  });
}
