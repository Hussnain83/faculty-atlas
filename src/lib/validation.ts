/** Shared rules for directory entries, used by the forms, the CSV import (in the browser) and the server. */

export type PersonInput = {
  full_name: string;
  email: string;
  title: string;
  department: string;
  office: string;
  phone_ext: string;
  joined_year: string;
};

export type PersonValue = {
  full_name: string;
  email: string;
  title: string;
  department: string;
  office: string | null;
  phone_ext: string | null;
  joined_year: number | null;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePerson(raw: Partial<PersonInput>): { value: PersonValue; errors: Partial<Record<keyof PersonInput, string>> } {
  const t = (v: unknown) => String(v ?? "").trim();
  const value: PersonValue = {
    full_name: t(raw.full_name).replace(/\s+/g, " "),
    email: t(raw.email).toLowerCase(),
    title: t(raw.title),
    department: t(raw.department),
    office: t(raw.office) || null,
    phone_ext: t(raw.phone_ext) || null,
    joined_year: t(raw.joined_year) ? Number(t(raw.joined_year)) : null,
  };
  const errors: Partial<Record<keyof PersonInput, string>> = {};
  if (value.full_name.length < 2 || value.full_name.length > 120) errors.full_name = "Enter the person's full name.";
  if (!EMAIL_RE.test(value.email)) errors.email = "Enter a valid email address.";
  if (value.title.length > 120) errors.title = "Keep the title under 120 characters.";
  if (value.department.length > 120) errors.department = "Keep the department under 120 characters.";
  if (value.joined_year !== null && (!Number.isInteger(value.joined_year) || value.joined_year < 1950 || value.joined_year > 2100)) {
    errors.joined_year = "Use a year between 1950 and 2100.";
  }
  return { value, errors };
}

export const GROUP_COLORS = ["lagoon", "coral", "iris", "saffron", "mint"] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 40)
      .replace(/-$/, "") || "group"
  );
}

/** Minimal CSV parser: handles quotes, escaped quotes, commas/semicolons and CRLF. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/** Maps common header spellings to our fields. */
export const CSV_HEADERS: Record<string, keyof PersonInput | "groups"> = {
  name: "full_name",
  "full name": "full_name",
  full_name: "full_name",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  title: "title",
  position: "title",
  designation: "title",
  department: "department",
  dept: "department",
  office: "office",
  room: "office",
  phone: "phone_ext",
  ext: "phone_ext",
  extension: "phone_ext",
  phone_ext: "phone_ext",
  joined: "joined_year",
  "joined year": "joined_year",
  joined_year: "joined_year",
  year: "joined_year",
  groups: "groups",
  group: "groups",
};
