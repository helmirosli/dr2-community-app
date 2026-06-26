import { z } from "zod";

import { isValidMonthRange, expandMonthRange } from "@/lib/months";
import { ringgitToSen } from "@/lib/money";

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().optional().or(z.literal(""));

export const publicSubmissionSchema = z
  .object({
    unitNumber: requiredText.max(30),
    residentName: optionalText,
    phone: optionalText,
    paymentType: z.enum(["MONTHLY_FEE", "SPECIAL_COLLECTION"]),
    amount: z.coerce.number().positive().max(100000),
    paymentDate: requiredText,
    method: z.enum(["CASH", "BANK_TRANSFER", "DUITNOW_QR", "EWALLET", "CHEQUE", "OTHER"]),
    coverageStartYear: z.coerce.number().int().min(2020).max(2100),
    coverageStartMonth: z.coerce.number().int().min(1).max(12),
    coverageEndYear: z.coerce.number().int().min(2020).max(2100),
    coverageEndMonth: z.coerce.number().int().min(1).max(12),
    specialCollectionId: z.string().optional(),
    referenceNo: optionalText,
    notes: optionalText,
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      !isValidMonthRange(
        value.coverageStartYear,
        value.coverageStartMonth,
        value.coverageEndYear,
        value.coverageEndMonth,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["coverageEndMonth"],
        message: "End month must be the same as or later than start month.",
      });
    }

    const coveredMonths = expandMonthRange(
      value.coverageStartYear,
      value.coverageStartMonth,
      value.coverageEndYear,
      value.coverageEndMonth,
    );

    if (coveredMonths.length > 24) {
      ctx.addIssue({
        code: "custom",
        path: ["coverageEndMonth"],
        message: "Public submissions can cover up to 24 months.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    amountSen: ringgitToSen(value.amount),
    residentName: value.residentName || undefined,
    phone: value.phone || undefined,
    referenceNo: value.referenceNo || undefined,
    notes: value.notes || undefined,
  }));

export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;