/**
 * Who this installation is for. Set these in the hosting environment (Vercel → Settings → Environment
 * Variables) before building; the defaults are the fictional demo university.
 */
export const ORG = {
  /** Full name, e.g. "University of Lahore". */
  name: process.env.NEXT_PUBLIC_ORG_NAME || "Northfield University",
  /** Short name used in phrases like "co-authors at Northfield". */
  short: process.env.NEXT_PUBLIC_ORG_SHORT || "Northfield",
  /** Staff email domain, used for examples like name@uni.edu. */
  emailDomain: process.env.NEXT_PUBLIC_ORG_EMAIL_DOMAIN || "northfield.edu",
  /** Who people contact for access, shown on sign-in pages. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "research.office@northfield.edu",
};

export const exampleEmail = (local = "name") => `${local}@${ORG.emailDomain}`;
