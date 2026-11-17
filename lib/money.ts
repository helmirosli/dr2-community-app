export const DEFAULT_MONTHLY_FEE_SEN = 5000;

export function formatRM(amountSen: number) {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amountSen / 100);
}

export function ringgitToSen(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

/** "RM 1,440" when there are no cents, "RM 33.33" when there are. For headline figures; ledgers keep formatRM so decimals line up. */
export function formatRMShort(sen: number) {
  return formatRM(sen).replace(/\.00$/, "");
}
