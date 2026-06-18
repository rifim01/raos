export type SheetRow = Record<string, string>;

export interface ImportError {
  row?: number;
  code?: string;
  message: string;
  batch?: number;
  details?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
  rows_fetched?: number;
  headers?: string[];
}
