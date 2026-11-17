import Link from "next/link";
import { Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getPaymentsLedger, parseLedgerParams } from "@/lib/reports/payments-ledger";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { PaymentsView } from "./payments-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
    perPage?: string;
    created?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;
  const { filters, page, perPage } = parseLedgerParams(params);

  const [t, locale, ledger] = await Promise.all([getDictionary(), getLocale(), getPaymentsLedger(filters, page, perPage)]);

  return (
    <AdminPage>
      <PageHeader
        title={t.payments.title}
        subtitle={t.payments.ledger}
        actions={
          <Link className="ui-button-primary" href="/payments/new">
            <Plus aria-hidden="true" size={16} />
            {t.payments.recordPayment}
          </Link>
        }
      />

      {params.created && <div className="ui-alert-success">{t.payments.recordedSuccess}</div>}

      <PaymentsView t={t} locale={locale} ledger={ledger} filters={filters} perPage={perPage} createdId={params.created} now={new Date()} />
    </AdminPage>
  );
}
