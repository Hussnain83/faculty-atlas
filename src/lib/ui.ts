/** Small presentation helpers shared by pages. */

export const GROUP_COLOR_VAR: Record<string, string> = {
  lagoon: "var(--lagoon)",
  coral: "var(--coral)",
  iris: "var(--iris)",
  saffron: "var(--saffron)",
  mint: "var(--mint)",
};

export const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--mint)" },
  invited: { label: "Not activated", color: "var(--saffron)" },
  deactivated: { label: "Deactivated", color: "var(--coral)" },
};

/** Strip characters that would break a PostgREST or() filter. */
export const safeSearch = (q: string) => q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
