/**
 * House numbers are stored as text, so the database sorts them "1, 11, 12, 2". Sort with this
 * instead: numeric where it can be ("2" before "11"), then text ("12A" after "12").
 */
export function compareUnits(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortByUnit<T extends { unitNumber: string }>(rows: T[]): T[] {
  return rows.sort((x, y) => compareUnits(x.unitNumber, y.unitNumber));
}
