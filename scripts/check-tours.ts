// Self-check for the walkthrough tours. Run: npm run check:tours
// Fails when a tour step points at an element that no longer carries its data-tour marker, when a
// translation is missing, or when two tours claim the same page.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import en from "@/lib/i18n/dictionaries/en";
import ms from "@/lib/i18n/dictionaries/ms";
import { TOURS, tourForPath, type Audience } from "@/lib/tours/defs";
import { parseCookie, parseSeen, serializeCookie } from "@/lib/tours/state";

// 1. Every data-tour="…" marker in the app (plain strings, and the literals inside {…} expressions).
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
const markers = new Set<string>();
for (const file of sourceFiles("app")) {
  for (const [, plain, expr] of readFileSync(file, "utf8").matchAll(/data-tour=(?:"([^"]+)"|\{([^}]*)\})/g)) {
    if (plain) markers.add(plain);
    for (const [, literal] of (expr ?? "").matchAll(/"([a-z0-9-]+)"/g)) markers.add(literal);
  }
}

// 2. Tours are well formed, every step has a marker and text in both languages.
const ids = TOURS.map((tour) => tour.id);
assert.equal(new Set(ids).size, ids.length, "tour ids must be unique");
for (const tour of TOURS) {
  assert.ok(tour.version >= 1, `${tour.id}: version must be 1 or more`);
  assert.ok(tour.minSteps >= 1 && tour.minSteps <= tour.steps.length, `${tour.id}: minSteps must fit the steps`);
  assert.ok(!tour.path || tour.match(tour.path), `${tour.id}: its own path must match it`);
  assert.ok(!tour.auto || tour.steps.some((step) => step.anchor), `${tour.id}: a tour that starts by itself needs something to point at`);
  for (const dict of [en, ms]) {
    assert.ok(tour.name(dict) && tour.summary(dict), `${tour.id}: name and summary are needed`);
    for (const step of tour.steps) {
      const text = step.text(dict);
      assert.ok(text.title && text.body, `${tour.id}: every step needs a title and a body`);
    }
  }
  for (const step of tour.steps) {
    if (step.anchor) assert.ok(markers.has(step.anchor), `${tour.id}: nothing in app/ is marked data-tour="${step.anchor}"`);
  }
}

// 3. One tour per page and audience, and the right one.
const pages: [Audience, string, string | null][] = [
  ["staff", "/dashboard", "staff-welcome"],
  ["staff", "/review", "review"],
  ["staff", "/residents", "houses"],
  ["staff", "/residents/abc-123", "house-detail"],
  ["staff", "/residents/new", null],
  ["staff", "/payments", "payments"],
  ["staff", "/payments/new", "record-payment"],
  ["staff", "/special-collections", "collections"],
  ["staff", "/special-collections/abc-123", "collection-detail"],
  ["staff", "/special-collections/new", null],
  ["staff", "/reports", "reports"],
  ["staff", "/settings", "settings"],
  ["resident", "/", "resident-home"],
  ["resident", "/rumah/12", "resident-house"],
  ["resident", "/submit", "resident-submit"],
  ["resident", "/status", null],
];
for (const [audience, path, expected] of pages) {
  const matching = TOURS.filter((tour) => tour.audience === audience && tour.match(path));
  assert.ok(matching.length <= 1, `${path}: more than one ${audience} tour matches`);
  assert.equal(tourForPath(audience, path)?.id ?? null, expected, `${path}: wrong tour`);
}

// 4. What a person has seen is read back safely.
assert.deepEqual(parseSeen({ review: 1, bad: "x", "Not Ok": 1, zero: 0, nested: {}, float: 1.5 }), { review: 1 });
assert.deepEqual(parseSeen(null), {});
assert.deepEqual(parseSeen([1, 2]), {});
assert.deepEqual(parseCookie("resident-home:1|resident-house:2|junk|x:y|:3"), { "resident-home": 1, "resident-house": 2 });
assert.deepEqual(parseCookie(encodeURIComponent("resident-home:1|resident-submit:1")), { "resident-home": 1, "resident-submit": 1 });
assert.deepEqual(parseCookie(undefined), {});
assert.deepEqual(parseCookie(serializeCookie({ a: 1, "b-c": 2 })), { a: 1, "b-c": 2 });

console.log(`tours self-check: ok (${TOURS.length} tours, ${markers.size} markers)`);
