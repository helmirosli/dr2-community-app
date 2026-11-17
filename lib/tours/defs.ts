import type { Dictionary } from "@/lib/i18n";

export type Audience = "staff" | "resident";
export type StaffRole = "ADMIN" | "AJK";

export type TourId =
  | "staff-welcome"
  | "review"
  | "houses"
  | "house-detail"
  | "record-payment"
  | "payments"
  | "collections"
  | "collection-detail"
  | "reports"
  | "settings"
  | "resident-home"
  | "resident-house"
  | "resident-submit";

type Text = { title: string; body: string };

export type TourStep = {
  /** The `data-tour` value of the element to point at. null = a centred note that points at nothing. */
  anchor: string | null;
  text: (t: Dictionary) => Text;
  /** Only shown to these roles. Default: everyone. */
  roles?: StaffRole[];
};

export type TourDef = {
  id: TourId;
  audience: Audience;
  /** Raise it to show a rewritten tour again to people who already saw the old one. */
  version: number;
  /** Starts by itself the first time the page is opened. Otherwise only when someone asks for it. */
  auto: boolean;
  /** Where to go to play it from somewhere else. Pages with an id in the address have none. */
  path?: string;
  match: (pathname: string) => boolean;
  /** Fewest steps worth starting on its own: a page with nothing to point at is not worth a tour. */
  minSteps: number;
  name: (t: Dictionary) => string;
  summary: (t: Dictionary) => string;
  steps: TourStep[];
};

/** One tour per page, plus a welcome. Steps point at elements marked data-tour="…"; `npm run check:tours` keeps the two in step. */
export const TOURS: TourDef[] = [
  {
    id: "staff-welcome",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/dashboard",
    match: (p) => p === "/dashboard",
    minSteps: 3,
    name: (t) => t.tour.tours.staffWelcome.name,
    summary: (t) => t.tour.tours.staffWelcome.summary,
    steps: [
      { anchor: "nav-main", text: (t) => t.tour.steps.staffWelcome.menu },
      { anchor: "today-review", text: (t) => t.tour.steps.staffWelcome.review },
      { anchor: "today-houses", text: (t) => t.tour.steps.staffWelcome.houses },
      { anchor: "header-search", text: (t) => t.tour.steps.staffWelcome.search },
      { anchor: "nav-record", text: (t) => t.tour.steps.staffWelcome.record },
      { anchor: "nav-settings", text: (t) => t.tour.steps.staffWelcome.team, roles: ["ADMIN"] },
      { anchor: "help-entry", text: (t) => t.tour.steps.staffWelcome.help },
    ],
  },
  {
    id: "review",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/review",
    match: (p) => p === "/review",
    minSteps: 3,
    name: (t) => t.tour.tours.review.name,
    summary: (t) => t.tour.tours.review.summary,
    steps: [
      { anchor: "review-queue", text: (t) => t.tour.steps.review.queue },
      { anchor: "review-verdict", text: (t) => t.tour.steps.review.verdict },
      { anchor: "review-receipt", text: (t) => t.tour.steps.review.receipt },
      { anchor: "review-actions", text: (t) => t.tour.steps.review.actions },
    ],
  },
  {
    id: "houses",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/residents",
    match: (p) => p === "/residents",
    minSteps: 3,
    name: (t) => t.tour.tours.houses.name,
    summary: (t) => t.tour.tours.houses.summary,
    steps: [
      { anchor: "houses-hero", text: (t) => t.tour.steps.houses.hero },
      { anchor: "houses-filters", text: (t) => t.tour.steps.houses.filters },
      { anchor: "houses-view", text: (t) => t.tour.steps.houses.view },
      { anchor: "houses-list", text: (t) => t.tour.steps.houses.list },
    ],
  },
  {
    id: "house-detail",
    audience: "staff",
    version: 1,
    auto: true,
    match: (p) => /^\/residents\/(?!new$)[^/]+$/.test(p),
    minSteps: 3,
    name: (t) => t.tour.tours.houseDetail.name,
    summary: (t) => t.tour.tours.houseDetail.summary,
    steps: [
      { anchor: "house-hero", text: (t) => t.tour.steps.houseDetail.hero },
      { anchor: "house-record", text: (t) => t.tour.steps.houseDetail.record },
      { anchor: "house-contact", text: (t) => t.tour.steps.houseDetail.contact },
      { anchor: "house-year", text: (t) => t.tour.steps.houseDetail.year },
      { anchor: "house-history", text: (t) => t.tour.steps.houseDetail.history },
    ],
  },
  {
    id: "record-payment",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/payments/new",
    match: (p) => p === "/payments/new",
    minSteps: 3,
    name: (t) => t.tour.tours.recordPayment.name,
    summary: (t) => t.tour.tours.recordPayment.summary,
    steps: [
      { anchor: "pay-resident", text: (t) => t.tour.steps.recordPayment.resident },
      { anchor: "pay-type", text: (t) => t.tour.steps.recordPayment.type },
      { anchor: "pay-amount", text: (t) => t.tour.steps.recordPayment.payment },
      { anchor: "pay-proof", text: (t) => t.tour.steps.recordPayment.proof },
    ],
  },
  {
    id: "payments",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/payments",
    match: (p) => p === "/payments",
    minSteps: 2,
    name: (t) => t.tour.tours.payments.name,
    summary: (t) => t.tour.tours.payments.summary,
    steps: [
      { anchor: "payments-hero", text: (t) => t.tour.steps.payments.hero },
      { anchor: "payments-filters", text: (t) => t.tour.steps.payments.filters },
      { anchor: "payments-list", text: (t) => t.tour.steps.payments.list },
    ],
  },
  {
    id: "collections",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/special-collections",
    match: (p) => p === "/special-collections",
    minSteps: 2,
    name: (t) => t.tour.tours.collections.name,
    summary: (t) => t.tour.tours.collections.summary,
    steps: [
      { anchor: "collections-new", text: (t) => t.tour.steps.collections.new },
      { anchor: "collections-card", text: (t) => t.tour.steps.collections.card },
      { anchor: "collections-open", text: (t) => t.tour.steps.collections.open },
    ],
  },
  {
    id: "collection-detail",
    audience: "staff",
    version: 1,
    auto: true,
    match: (p) => /^\/special-collections\/(?!new$)[^/]+$/.test(p),
    minSteps: 2,
    name: (t) => t.tour.tours.collectionDetail.name,
    summary: (t) => t.tour.tours.collectionDetail.summary,
    steps: [
      { anchor: "collection-hero", text: (t) => t.tour.steps.collectionDetail.hero },
      { anchor: "collection-tabs", text: (t) => t.tour.steps.collectionDetail.tabs },
      { anchor: "collection-list", text: (t) => t.tour.steps.collectionDetail.list },
    ],
  },
  {
    id: "reports",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/reports",
    match: (p) => p === "/reports",
    minSteps: 3,
    name: (t) => t.tour.tours.reports.name,
    summary: (t) => t.tour.tours.reports.summary,
    steps: [
      { anchor: "reports-hero", text: (t) => t.tour.steps.reports.hero },
      { anchor: "reports-filters", text: (t) => t.tour.steps.reports.filters },
      { anchor: "reports-grid", text: (t) => t.tour.steps.reports.grid },
      { anchor: "reports-export", text: (t) => t.tour.steps.reports.export },
    ],
  },
  {
    id: "settings",
    audience: "staff",
    version: 1,
    auto: true,
    path: "/settings",
    match: (p) => p === "/settings",
    minSteps: 2,
    name: (t) => t.tour.tours.settings.name,
    summary: (t) => t.tour.tours.settings.summary,
    steps: [
      { anchor: "settings-account", text: (t) => t.tour.steps.settings.account },
      { anchor: "settings-team", text: (t) => t.tour.steps.settings.team, roles: ["ADMIN"] },
      { anchor: "settings-roles", text: (t) => t.tour.steps.settings.roles },
    ],
  },
  {
    id: "resident-home",
    audience: "resident",
    version: 1,
    auto: true,
    path: "/",
    match: (p) => p === "/",
    minSteps: 2,
    name: (t) => t.tour.tours.residentHome.name,
    summary: (t) => t.tour.tours.residentHome.summary,
    steps: [
      { anchor: "home-lookup", text: (t) => t.tour.steps.residentHome.lookup },
      { anchor: "home-houses", text: (t) => t.tour.steps.residentHome.houses },
      { anchor: "home-pay", text: (t) => t.tour.steps.residentHome.pay },
    ],
  },
  {
    id: "resident-house",
    audience: "resident",
    version: 1,
    auto: false,
    match: (p) => /^\/rumah\/[^/]+$/.test(p),
    minSteps: 2,
    name: (t) => t.tour.tours.residentHouse.name,
    summary: (t) => t.tour.tours.residentHouse.summary,
    steps: [
      { anchor: "rumah-lamp", text: (t) => t.tour.steps.residentHouse.lamp },
      { anchor: "rumah-pay", text: (t) => t.tour.steps.residentHouse.pay },
      { anchor: "rumah-months", text: (t) => t.tour.steps.residentHouse.months },
      { anchor: "rumah-year", text: (t) => t.tour.steps.residentHouse.year },
    ],
  },
  {
    id: "resident-submit",
    audience: "resident",
    version: 1,
    auto: false,
    path: "/submit",
    match: (p) => p === "/submit",
    minSteps: 2,
    name: (t) => t.tour.tours.residentSubmit.name,
    summary: (t) => t.tour.tours.residentSubmit.summary,
    steps: [
      { anchor: "submit-steps", text: (t) => t.tour.steps.residentSubmit.steps },
      { anchor: "submit-house", text: (t) => t.tour.steps.residentSubmit.house },
      { anchor: null, text: (t) => t.tour.steps.residentSubmit.next },
    ],
  },
];

export const toursFor = (audience: Audience) => TOURS.filter((tour) => tour.audience === audience);

export const tourById = (id: string) => TOURS.find((tour) => tour.id === id);

/** The tour that belongs to the page being shown, if there is one. */
export const tourForPath = (audience: Audience, pathname: string) => toursFor(audience).find((tour) => tour.match(pathname));

/** A person has seen a tour once they have finished or skipped the current version of it. */
export const hasSeen = (seen: Record<string, number>, tour: TourDef) => (seen[tour.id] ?? 0) >= tour.version;
