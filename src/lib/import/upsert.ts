import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportError } from "./types";
import { importLog } from "./logger";

export async function upsertBatch<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 50
): Promise<{ inserted: number; failed: number; errors: ImportError[] }> {
  let inserted = 0;
  let failed = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    const { error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(batch as any, { onConflict, ignoreDuplicates: false });

    if (error) {
      failed += batch.length;
      const errEntry: ImportError = {
        batch: batchIndex,
        message: error.message,
        details: error.details ?? error.hint ?? undefined,
        code: error.code,
      };
      errors.push(errEntry);
      importLog("error", `upsert ${table} batch failed`, {
        batch: batchIndex,
        rowRange: `${i + 1}-${i + batch.length}`,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sample: batch[0],
      });
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, failed, errors };
}
