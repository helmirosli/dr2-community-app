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