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
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-2xl font-bold text-emerald-700">{analysis.newPayments.length}</div>
          <p className="text-sm text-emerald-800">New payments to import</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-2xl font-bold text-amber-700">{analysis.matchingPayments.length}</div>
          <p className="text-sm text-amber-800">Already exist (duplicates)</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-2xl font-bold text-red-700">{analysis.invalidRows.length}</div>
          <p className="text-sm text-red-800">Invalid entries</p>
        </div>
      </div>

      {/* New Payments */}
      {analysis.newPayments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">New Payments ({analysis.newPayments.length})</h3>
            <p className="mt-1 text-sm text-slate-600">These payments will be added to your records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold w-10">
                    <input
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
                  <th className="px-6 py-3 font-semibold">Unit</th>
                  <th className="px-6 py-3 font-semibold">Resident</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.newPayments.map((payment) => (
                  <tr className="transition hover:bg-slate-50" key={payment.id}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedToImport.has(payment.id)}
                        onChange={() => togglePayment(payment.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{payment.unitNumber}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.residentName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatRM(payment.amountSen)}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.paymentDate}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matching Payments */}
      {analysis.matchingPayments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <AlertCircle className="text-amber-600" size={18} />
              Duplicate Payments ({analysis.matchingPayments.length})
            </h3>
            <p className="mt-1 text-sm text-slate-600">These payments already exist in your records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Unit</th>
                  <th className="px-6 py-3 font-semibold">Resident</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.matchingPayments.map((payment, idx) => (
                  <tr className="bg-amber-50 hover:bg-amber-100 transition" key={idx}>
                    <td className="px-6 py-4 font-semibold text-slate-900">{payment.unitNumber}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.residentName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatRM(payment.amountSen)}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.paymentDate}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <AlertCircle size={12} />
                        Duplicate
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invalid Rows */}
      {analysis.invalidRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <XCircle className="text-red-600" size={18} />
              Invalid Entries ({analysis.invalidRows.length})
            </h3>
            <p className="mt-1 text-sm text-slate-600">These rows could not be imported due to errors</p>
          </div>
          <div className="space-y-3 px-6 py-4">
            {analysis.invalidRows.map((row, idx) => {
              const dataStr = row.data
                ? typeof row.data === 'string'
                  ? row.data
                  : JSON.stringify(row.data)
                : '';
              return (
                <div className="text-sm text-slate-600" key={idx}>
                  <p className="font-medium text-slate-900">Row {row.rowNumber}: {row.error}</p>
                  {dataStr && <p className="text-xs text-slate-500 mt-1">{dataStr}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import Button */}
      {selectedToImport.size > 0 && (
        <div className="space-y-4">
          {importMessage && (
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              importMessage.startsWith("✓")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {importing ? "Importing..." : `Import ${selectedToImport.size} Payment(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
