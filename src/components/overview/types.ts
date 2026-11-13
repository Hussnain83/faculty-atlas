export type OvPerson = { id: string; name: string; title: string; photoUrl: string | null; papers: number; cites: number; h: number; completeness: number; nextStep: string | null; nextPoints: number; groups: number };
export type OvGroup = { id: string; slug: string; name: string; shortCode: string; color: string; description: string | null; open: boolean; members: number; papers: number; faces: { name: string; photoUrl: string | null }[] };
export type OvActivity = { id: number; kind: "publication" | "cv" | "person" | "award" | "group"; summary: string; subject: string; when: string; who: { id: string; name: string; photoUrl: string | null } | null };

export type OverviewData = {
  isAdmin: boolean;
  greeting: string;
  today: string;
  thisYear: number;
  me: (OvPerson & { missing: { label: string; points: number }[] }) | null;
  people: OvPerson[];
  groups: OvGroup[];
  years: { l: string; v: number }[];
  totals: { people: number; papers: number; papersThisYear: number; cvs: number; inGroups: number; memberships: number; myGroups: number };
  activity: OvActivity[];
};
