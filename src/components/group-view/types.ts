import type { ProfilePublication } from "@/components/profile-view/types";

export type GroupMember = {
  id: string;
  name: string;
  title: string;
  department: string;
  status: "active" | "invited" | "deactivated";
  photoUrl: string | null;
  isLead: boolean;
  skills: string[];
  completeness: number;
};

export type GroupPublication = ProfilePublication & { memberIds: string[] };

export type GroupData = {
  id: string;
  slug: string;
  name: string;
  shortCode: string;
  description: string | null;
  color: string; // token name, e.g. "lagoon"
  foundedYear: number | null;
  archived: boolean;
  members: GroupMember[];
  publications: GroupPublication[];
  /** People registered in the directory (admins only), for the gauge. */
  directorySize: number | null;
  isAdmin: boolean;
  thisYear: number;
};
