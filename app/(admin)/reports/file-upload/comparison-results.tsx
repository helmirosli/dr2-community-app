"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

import { type FileAnalysisResult, confirmPaymentImport } from "@/lib/actions/file-upload";
import { formatRM } from "@/lib/money";

type ComparisonResultsProps = {
  analysis: FileAnalysisResult;
};

export function ComparisonResults({ analysis }: ComparisonResultsProps) {
  const [selectedToImport, setSelectedToImport] = useState<Set<string>>(
    new Set(analysis.newPayments.map((p) => p.id))
  );
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const togglePayment = (id: string) => {
    const newSet = new Set(selectedToImport);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedToImport(newSet);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportMessage("");

    try {
      const result = await confirmPaymentImport(Array.from(selectedToImport));
      if (result.ok) {
        setImportMessage(`✓ Successfully imported ${result.imported} payments`);
      } else {
        setImportMessage(`✗ Import failed: ${result.message}`);
      }
    } catch {
      setImportMessage("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="ui-card p-4">
          <div className="font-heading text-3xl font-bold tracking-tight tabular-nums text-[#1c7a33]">{analysis.newPayments.length}</div>
          <p className="text-sm text-[var(--ink-2)]">New payments to import</p>
        </div>
        <div className="ui-card p-4">
          <div className="font-heading text-3xl font-bold tracking-tight tabular-nums text-[#8a6300]">{analysis.matchingPayments.length}</div>
          <p className="text-sm text-[var(--ink-2)]">Already exist (duplicates)</p>
        </div>
        <div className="ui-card p-4">
          <div className="font-heading text-3xl font-bold tracking-tight tabular-nums text-[#c2341a]">{analysis.invalidRows.length}</div>
          <p className="text-sm text-[var(--ink-2)]">Invalid entries</p>
        </div>
      </div>

      {/* New Payments */}
      {analysis.newPayments.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-black/5 px-5 py-4">
            <h3 className="ui-section-title">New Payments ({analysis.newPayments.length})</h3>
            <p className="ui-hint mt-1">These payments will be added to your records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      aria-label="Select all"
                      type="checkbox"
                      checked={selectedToImport.size === analysis.newPayments.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedToImport(new Set(analysis.newPayments.map((p) => p.id)));
                        } else {
                          setSelectedToImport(new Set());
                        }
                      }}
                    />
                  </th>
                  <th>Unit</th>
                  <th>Resident</th>
                  <th className="text-right">Amount</th>
                  <th>Date</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {analysis.newPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <input
                        aria-label={payment.unitNumber}
                        type="checkbox"
                        checked={selectedToImport.has(payment.id)}
                        onChange={() => togglePayment(payment.id)}
                      />
                    </td>
                    <td className="font-heading font-bold text-[var(--ink)]">{payment.unitNumber}</td>
                    <td className="text-[var(--ink-2)]">{payment.residentName}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums text-[var(--ink)]">{formatRM(payment.amountSen)}</td>
                    <td className="whitespace-nowrap text-[var(--ink-2)]">{payment.paymentDate}</td>
                    <td className="text-[var(--ink-2)]">{payment.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Matching Payments */}
      {analysis.matchingPayments.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-black/5 px-5 py-4">
            <h3 className="ui-section-title flex items-center gap-2">
              <AlertCircle className="text-[#8a6300]" size={18} />
              Duplicate Payments ({analysis.matchingPayments.length})
            </h3>
            <p className="ui-hint mt-1">These payments already exist in your records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Resident</th>
                  <th className="text-right">Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.matchingPayments.map((payment, idx) => (
                  <tr key={idx}>
                    <td className="font-heading font-bold text-[var(--ink)]">{payment.unitNumber}</td>
                    <td className="text-[var(--ink-2)]">{payment.residentName}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums text-[var(--ink)]">{formatRM(payment.amountSen)}</td>
                    <td className="whitespace-nowrap text-[var(--ink-2)]">{payment.paymentDate}</td>
                    <td>
                      <span className="ui-chip bg-[#fff4d6] text-[#8a6300]">
                        <AlertCircle size={12} />
                        Duplicate
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invalid Rows */}
      {analysis.invalidRows.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-black/5 px-5 py-4">
            <h3 className="ui-section-title flex items-center gap-2">
              <XCircle className="text-[#c2341a]" size={18} />
              Invalid Entries ({analysis.invalidRows.length})
            </h3>
            <p className="ui-hint mt-1">These rows could not be imported due to errors</p>
          </div>
          <div className="grid gap-3 px-5 py-4">
            {analysis.invalidRows.map((row, idx) => {
              const dataStr = row.data
                ? typeof row.data === 'string'
                  ? row.data
                  : JSON.stringify(row.data)
                : '';
              return (
                <div className="text-sm text-[var(--ink-2)]" key={idx}>
                  <p className="font-medium text-[var(--ink)]">Row {row.rowNumber}: {row.error}</p>
                  {dataStr && <p className="ui-hint mt-1 break-all">{dataStr}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Import Button */}
      {selectedToImport.size > 0 && (
        <div className="grid gap-4">
          {importMessage && (
            <div className={`flex items-start gap-3 ${
              importMessage.startsWith("✓") ? "ui-alert-success" : "ui-alert-error"
            }`}>
              {importMessage.startsWith("✓") ? (
                <CheckCircle2 className="shrink-0" size={18} />
              ) : (
                <AlertCircle className="shrink-0" size={18} />
              )}
              <p>{importMessage}</p>
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={importing}
            className="ui-button-primary w-fit"
          >
            <CheckCircle2 size={18} />
            {importing ? "Importing..." : `Import ${selectedToImport.size} Payment(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
