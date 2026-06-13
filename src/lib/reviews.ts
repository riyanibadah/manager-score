import { createHash } from "node:crypto";
import type { TagSentiment } from "@prisma/client";

export type IncomingReview = {
  managerName?: string;
  managerTitle?: string;
  company?: string;
  department?: string;
  linkedinUrl?: string;
  reviewerRole?: string;
  workedWith?: string;
  employmentType?: string;
  employeeStatus?: string;
  communication?: number;
  worklife?: number;
  recognition?: number;
  wouldAgain?: boolean;
  reviewText?: string;
  traits?: Array<{ tag?: string; sentiment?: string }>;
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function hashValue(value: string) {
  const salt = process.env.REVIEW_HASH_SALT || "dev-review-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function hashRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor || realIp;
  return ip ? hashValue(ip) : undefined;
}

export function normalizeCompanyName(value: string) {
  const cleaned = cleanCompanyInput(value);
  if (!cleaned) return "";

  const alias = COMPANY_ALIASES[companyKey(cleaned)];
  if (alias) return alias;

  return cleaned;
}

export function canonicalManagerNameForSlug(value: string) {
  const parts = value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.replace(/(^[^A-Za-z0-9]+|[^A-Za-z0-9.]+$)/g, ""))
    .filter(Boolean);

  const withoutSuffix = parts.filter((part, index) => {
    const normalized = part.toLowerCase().replace(/\./g, "");
    const isLast = index === parts.length - 1;
    return !(isLast && ["jr", "sr", "ii", "iii", "iv", "v"].includes(normalized));
  });

  return withoutSuffix
    .filter((part, index) => {
      const normalized = part.replace(/\./g, "");
      const isMiddle = index > 0 && index < withoutSuffix.length - 1;
      return !(isMiddle && /^[A-Za-z]$/.test(normalized));
    })
    .join(" ");
}

export function isFullPersonName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part)).length >= 2;
}

export function normalizeReview(input: IncomingReview) {
  const managerName = cleanRequired(input.managerName, "Manager name");
  const managerTitle = cleanRequired(input.managerTitle, "Manager title");
  const company = normalizeCompanyName(cleanRequired(input.company, "Company"));
  const reviewText = cleanRequired(input.reviewText, "Review");

  if (!isFullPersonName(managerName)) {
    throw new Error("Please enter the manager's first and last name.");
  }

  if (reviewText.length < 80) {
    throw new Error("Review must be at least 80 characters.");
  }

  const review = {
    managerName,
    managerTitle,
    company,
    department: cleanOptional(input.department),
    linkedinUrl: cleanLinkedin(input.linkedinUrl),
    reviewerRole: cleanOptional(input.reviewerRole),
    workedWith: allowedOptional(input.workedWith, [
      "Less than 6 months",
      "6-12 months",
      "1-2 years",
      "2+ years",
    ]),
    employmentType: allowedOptional(input.employmentType, [
      "Full-time",
      "Part-time",
      "Intern",
      "Contractor",
    ]),
    employeeStatus: allowedOptional(input.employeeStatus, [
      "Current employee",
      "Former employee",
    ]),
    communication: rating(input.communication, "Communication"),
    worklife: rating(input.worklife, "Work-life balance"),
    recognition: rating(input.recognition, "Recognition"),
    wouldAgain: typeof input.wouldAgain === "boolean" ? input.wouldAgain : null,
    reviewText,
    traits: (input.traits || [])
      .map((trait) => ({
        tag: cleanOptional(trait.tag),
        sentiment: toSentiment(trait.sentiment),
      }))
      .filter((trait): trait is { tag: string; sentiment: TagSentiment } => Boolean(trait.tag))
      .slice(0, 8),
  };

  if (review.wouldAgain === null) {
    throw new Error("Would-work-again answer is required.");
  }

  return {
    ...review,
    overall: Math.round(((review.communication + review.worklife + review.recognition) / 3) * 10) / 10,
  } as typeof review & { wouldAgain: boolean; overall: number };
}

function cleanRequired(value: unknown, label: string) {
  const cleaned = cleanOptional(value);
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function cleanOptional(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || undefined;
}

function cleanCompanyInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,?\s+(incorporated|inc|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|plc|sa|s\.a|ag|gmbh|lp|llp)\.?$/i, "")
    .replace(/\s+(&|and)\s*$/i, "")
    .trim();
}

function companyKey(value: string) {
  return cleanCompanyInput(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const COMPANY_ALIASES = buildCompanyAliases([
  ["3M", "Minnesota Mining and Manufacturing"],
  ["Abbott", "Abbott Laboratories", "ABT"],
  ["AbbVie", "ABBV"],
  ["Accenture", "ACN"],
  ["Adobe", "Adobe Systems", "ADBE", "Creative Cloud"],
  ["AMD", "Advanced Micro Devices", "Ryzen", "Radeon"],
  ["Airbnb", "Air Bed and Breakfast", "ABNB"],
  ["Airbus"],
  ["Alibaba", "Alibaba Group", "BABA", "Ali Baba"],
  ["Amazon", "AWS", "Amazon Web Services", "Amazon.com", "Amazon Com", "AMZN", "Prime Video", "Twitch", "Audible", "Amazon Prime", "Amazon Ads", "Amazon Robotics"],
  ["American Express", "AmEx", "AXP", "American Express Global Business Travel"],
  ["Amgen", "AMGN"],
  ["Apple", "Apple Computer", "AAPL", "iCloud", "Apple TV", "Apple Music", "App Store"],
  ["Arista Networks", "Arista", "ANET"],
  ["ASML", "ASML Holding"],
  ["AstraZeneca", "Astra Zeneca", "AZN"],
  ["AT&T", "ATT", "AT and T", "T"],
  ["Atlassian", "TEAM", "Jira", "Confluence", "Trello", "Bitbucket"],
  ["Baidu", "BIDU"],
  ["Bank of America", "BofA", "BOA", "BAC", "BofA Securities", "Bank of America Merrill Lynch", "Merrill Lynch", "Merrill"],
  ["Barclays", "Barclays Bank", "BCS"],
  ["Berkshire Hathaway", "Berkshire", "BRK"],
  ["BlackRock", "Black Rock", "BLK"],
  ["Blackstone", "Blackstone Group", "BX"],
  ["BMO", "Bank of Montreal"],
  ["Boeing", "BA"],
  ["Booking Holdings", "Booking", "Booking.com", "Priceline", "Kayak", "OpenTable", "BKNG"],
  ["Broadcom", "AVGO"],
  ["Bristol Myers Squibb", "Bristol Myers", "Bristol-Myers Squibb", "BMS", "BMY"],
  ["ByteDance", "TikTok", "Tik Tok", "Douyin", "CapCut", "Lemon8"],
  ["Capital One", "CapitalOne", "COF"],
  ["Caterpillar", "CAT"],
  ["Chevron", "CVX"],
  ["Cisco", "Cisco Systems", "CSCO", "Webex", "Meraki"],
  ["Citi", "Citibank", "Citigroup", "C"],
  ["Coca-Cola", "Coca Cola", "Coke", "KO"],
  ["Comcast", "Xfinity", "CMCSA", "NBCUniversal", "NBC Universal"],
  ["ConocoPhillips", "Conoco Phillips", "COP"],
  ["Costco", "Costco Wholesale", "COST"],
  ["CVS Health", "CVS", "Aetna"],
  ["Cloudflare", "NET", "Cloud Flare"],
  ["Coinbase", "COIN"],
  ["Databricks", "Data Bricks"],
  ["Deutsche Bank", "Deutsche", "DB"],
  ["Deloitte", "Deloitte Consulting", "Deloitte Digital"],
  ["Dell", "Dell Technologies", "DELL", "EMC", "Dell EMC"],
  ["DHL"],
  ["Disney", "The Walt Disney Company", "Walt Disney", "DIS", "ESPN", "Hulu"],
  ["DocuSign", "Docusign", "DOCU"],
  ["DoorDash", "Door Dash", "DASH", "Caviar"],
  ["Dropbox", "DBX"],
  ["EY", "Ernst and Young", "Ernst & Young"],
  ["Eli Lilly", "Lilly", "LLY"],
  ["ExxonMobil", "Exxon", "Exxon Mobil", "XOM"],
  ["FedEx", "Federal Express", "FDX"],
  ["Fidelity", "Fidelity Investments", "FMR"],
  ["Ford", "Ford Motor", "F"],
  ["GE", "General Electric", "GE Aerospace"],
  ["Gilead Sciences", "Gilead", "GILD"],
  ["GM", "General Motors"],
  ["Goldman Sachs", "Goldman", "Goldman Sachs Group", "GS"],
  ["Google", "Alphabet", "Alphabet Google", "GOOG", "GOOGL", "YouTube", "Youtube", "DeepMind", "Google DeepMind", "Google Cloud", "GCP", "Android", "Waymo", "Waze", "Fitbit", "Google Ads", "Google Search"],
  ["HCA Healthcare", "HCA"],
  ["Home Depot", "The Home Depot", "HD"],
  ["Honeywell", "HON"],
  ["HP", "Hewlett Packard", "Hewlett-Packard", "HPQ"],
  ["HPE", "Hewlett Packard Enterprise"],
  ["IBM", "International Business Machines"],
  ["Intel", "INTC", "Intel Corporation"],
  ["Intuit", "TurboTax", "QuickBooks", "INTU"],
  ["Johnson & Johnson", "Johnson and Johnson", "J and J", "JNJ"],
  ["JPMorgan Chase", "JPMorgan", "JP Morgan", "JP Morgan Chase", "J.P. Morgan", "J.P. Morgan Chase", "Chase", "JPMC", "JPM"],
  ["KPMG"],
  ["McKinsey", "McKinsey & Company", "McKinsey and Company"],
  ["Lockheed Martin", "Lockheed", "LMT"],
  ["Lowe's", "Lowes", "Lowe s", "LOW"],
  ["LVMH", "Louis Vuitton", "Moet Hennessy"],
  ["Instacart", "Maplebear", "CART"],
  ["Lyft", "LYFT"],
  ["Mastercard", "Master Card", "MA"],
  ["McDonald's", "McDonalds", "McDonald s", "MCD"],
  ["Meituan"],
  ["Merck", "MRK"],
  ["Meta", "Facebook", "FB", "Meta Platforms", "Instagram", "Insta", "IG", "WhatsApp", "Whatsapp", "Threads", "Reality Labs", "Oculus", "Quest"],
  ["Microsoft", "MSFT", "Azure", "LinkedIn", "Linkedin", "Github", "GitHub", "Office", "Office 365", "Microsoft 365", "M365", "Teams", "Xbox", "Bing", "Copilot", "Mojang", "Activision Blizzard"],
  ["Moderna", "MRNA"],
  ["Morgan Stanley", "Morgan", "MS"],
  ["Northrop Grumman", "Northrop", "NOC"],
  ["MongoDB", "MDB", "Mongo"],
  ["Netflix", "NFLX"],
  ["Nestle", "Nestlé"],
  ["Nike", "NKE"],
  ["Novo Nordisk", "NVO"],
  ["NVIDIA", "Nvidia", "NVDA", "GeForce"],
  ["OpenAI", "Open AI", "ChatGPT", "Chat GPT", "Dall-E", "DALL E", "Sora"],
  ["Oracle", "ORCL", "OCI", "Oracle Cloud", "NetSuite", "Netsuite"],
  ["Palo Alto Networks", "Palo Alto", "PANW"],
  ["Palantir", "PLTR"],
  ["PayPal", "Paypal", "PYPL", "Venmo", "Braintree"],
  ["PepsiCo", "Pepsi", "PEP", "Frito Lay", "Frito-Lay"],
  ["Pfizer", "PFE"],
  ["Procter & Gamble", "Procter and Gamble", "P and G", "P&G", "PG"],
  ["Qualcomm", "QCOM"],
  ["RTX", "Raytheon", "Raytheon Technologies", "Pratt Whitney", "Pratt & Whitney"],
  ["Roche"],
  ["Reddit", "RDDT"],
  ["Roblox", "RBLX"],
  ["Salesforce", "Sales Force", "SFDC", "CRM", "Slack", "Tableau", "MuleSoft", "Mulesoft", "Heroku"],
  ["Samsung", "Samsung Electronics", "Samsung Semiconductor"],
  ["Sanofi"],
  ["SAP"],
  ["ServiceNow", "Service Now", "NOW"],
  ["Charles Schwab", "Schwab", "SCHW"],
  ["Shopify", "SHOP"],
  ["Siemens"],
  ["Snap", "Snapchat", "SNAP"],
  ["Snowflake", "SNOW"],
  ["Sony", "Sony Interactive Entertainment", "PlayStation", "Playstation"],
  ["Spotify", "SPOT"],
  ["PwC", "PricewaterhouseCoopers", "Price Waterhouse Coopers"],
  ["Block", "Square", "Block Inc", "Cash App", "CashApp", "Afterpay"],
  ["Starbucks", "SBUX"],
  ["Stellantis", "Chrysler", "Dodge", "Jeep", "Ram"],
  ["Stripe"],
  ["Target", "TGT"],
  ["Tencent", "WeChat", "Wechat"],
  ["Tesla", "TSLA"],
  ["Toyota", "Toyota Motor", "TM"],
  ["TSMC", "Taiwan Semiconductor", "Taiwan Semiconductor Manufacturing"],
  ["Twilio", "TWLO", "Segment", "SendGrid", "Sendgrid"],
  ["T-Mobile", "TMobile", "T Mobile", "TMUS"],
  ["UBS", "UBS Group"],
  ["Uber", "Uber Technologies", "UBER", "Uber Eats"],
  ["UnitedHealth Group", "UnitedHealth", "United Healthcare", "UnitedHealthcare", "Optum", "UNH"],
  ["UPS", "United Parcel Service"],
  ["Verizon", "VZ"],
  ["Visa", "V"],
  ["Walgreens", "Walgreens Boots Alliance", "WBA"],
  ["Walmart", "Wal-Mart", "Wal Mart", "Wal-Mart Stores", "Walmart Stores", "WMT", "Sam's Club", "Sams Club"],
  ["Wells Fargo", "WFC"],
  ["Vercel"],
  ["VMware", "Vmware", "VMW"],
  ["Workday", "WDAY"],
  ["X", "Twitter", "X Corp"],
  ["Yelp", "YELP"],
  ["Zoom", "Zoom Video", "Zoom Video Communications", "ZM"],
  ["Zscaler", "ZS"],
]);

function buildCompanyAliases(groups: string[][]) {
  const aliases: Record<string, string> = {};
  for (const [canonical, ...variants] of groups) {
    for (const value of [canonical, ...variants]) {
      aliases[companyKey(value)] = canonical;
    }
  }
  return Object.freeze(aliases);
}

function rating(value: unknown, label: string) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    throw new Error(`${label} rating must be between 1 and 5.`);
  }
  return numeric;
}

function cleanLinkedin(value: unknown) {
  const cleaned = cleanOptional(value);
  if (!cleaned) return undefined;

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid LinkedIn URL.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) {
    throw new Error("LinkedIn URL must point to linkedin.com.");
  }

  url.protocol = "https:";
  return url.toString();
}

function allowedOptional(value: unknown, allowed: string[]) {
  const cleaned = cleanOptional(value);
  if (!cleaned) return undefined;
  return allowed.includes(cleaned) ? cleaned : undefined;
}

function toSentiment(value: unknown): TagSentiment {
  if (typeof value !== "string") return "NEUTRAL";
  const upper = value.toUpperCase();
  if (upper === "POSITIVE" || upper === "NEGATIVE" || upper === "NEUTRAL") return upper;
  return "NEUTRAL";
}
