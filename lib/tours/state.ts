/** Which version of each tour a person has already finished or skipped: { "<tourId>": <version> }. */
export type TourSeen = Record<string, number>;

/** Residents have no account, so what they have seen lives in this cookie on their own device. */
export const TOUR_COOKIE = "dr2_tours";

const ID = /^[a-z0-9-]+$/;

/** Reads what the database stored (JSON of unknown shape) into a clean { id: version } map. */
export function parseSeen(raw: unknown): TourSeen {
  const out: TourSeen = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [id, version] of Object.entries(raw)) {
    if (ID.test(id) && Number.isInteger(version) && (version as number) > 0) out[id] = version as number;
  }
  return out;
}

/** "resident-home:1|resident-house:1" becomes { "resident-home": 1, "resident-house": 1 }. */
export function parseCookie(value: string | null | undefined): TourSeen {
  const out: TourSeen = {};
  let text = value ?? "";
  try {
    text = decodeURIComponent(text);
  } catch {}
  for (const part of text.split("|")) {
    const [id, version] = part.split(":");
    const n = Number(version);
    if (id && ID.test(id) && Number.isInteger(n) && n > 0) out[id] = n;
  }
  return out;
}

export function serializeCookie(seen: TourSeen): string {
  return Object.entries(seen)
    .map(([id, version]) => `${id}:${version}`)
    .join("|");
}
