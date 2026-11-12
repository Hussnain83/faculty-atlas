/** Profile completeness: the same rules everywhere (editor, admin pages, overview nudges). */

export type CompletenessInput = {
  bio: string | null;
  photoPath: string | null;
  skills: number;
  publications: number;
  experiences: number;
  achievements: number;
  hasCv: boolean;
};

export type Completeness = { score: number; missing: { label: string; points: number; section: string }[] };

export function completeness(p: CompletenessInput): Completeness {
  const missing: Completeness["missing"] = [];
  let score = 0;
  const add = (ok: boolean, points: number, label: string, section: string, partial = 0) => {
    if (ok) score += points;
    else {
      score += partial;
      missing.push({ label, points: points - partial, section });
    }
  };
  add(Boolean(p.bio && p.bio.trim().length >= 40), 15, "Write a short bio (a few sentences)", "about");
  add(p.hasCv, 20, "Upload your CV", "cv");
  add(p.publications > 0, 20, "Add a publication", "publications");
  add(p.skills >= 5, 15, "List at least 5 skills", "skills", p.skills > 0 ? 8 : 0);
  add(p.experiences >= 2, 15, "Add your earlier roles or education", "career", p.experiences === 1 ? 8 : 0);
  add(p.achievements > 0, 10, "Add an award, grant or certificate", "achievements");
  add(Boolean(p.photoPath), 5, "Add a profile photo", "photo");
  missing.sort((a, b) => b.points - a.points);
  return { score, missing };
}

export const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
export const DOI_RE = /^10\.\d{4,9}\/\S+$/;

/** Accepts "https://doi.org/10.1/x", "doi:10.1/x" or a bare DOI and returns the bare DOI. */
export function cleanDoi(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}
