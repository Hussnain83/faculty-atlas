export type ProfileGroup = { id: string; slug: string; name: string; short_code: string; color: string };
export type ProfileAuthor = { id: string | null; name: string; photo: string | null };
export type ProfilePublication = {
  id: string;
  title: string;
  venue: string;
  kind: "journal" | "conference";
  year: number;
  doi: string | null;
  citations: number;
  external_authors: string[];
  authors: ProfileAuthor[];
};

export type ProfileData = {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  office: string | null;
  phone_ext: string | null;
  orcid: string | null;
  bio: string | null;
  photoUrl: string | null;
  joinedYear: number | null;
  status: "active" | "invited" | "deactivated";
  groups: ProfileGroup[];
  skills: { skill: string; category: "research" | "tools" | "teaching" }[];
  experiences: { id: string; role: string; organization: string; start_year: number; end_year: number | null; is_education: boolean; description: string | null }[];
  achievements: { id: string; kind: "award" | "grant" | "certificate"; title: string; organization: string; year: number }[];
  publications: ProfilePublication[];
  cv: { fileName: string; sizeBytes: number; pages: number | null; uploadedAt: string; url: string | null } | null;
  completeness: number;
  canEdit: boolean;
  isOwn: boolean;
  isAdminView: boolean;
  thisYear: number;
};
