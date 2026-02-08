import "server-only";

import { parseCsv } from "@/lib/server/csv";

export type CsvError = {
  line: number;
  message: string;
};

export type AirworkFieldInput = {
  fieldKey: string;
  labelJa: string;
  inputKind: "text" | "number" | "code" | "id" | "readonly";
  isEditable: boolean;
  sortOrder: number;
  specVersion: string;
};

export type AirworkCodeInput = {
  fieldKey: string;
  code: string;
  nameJa: string;
  isActive: boolean;
};

const FIELD_HEADERS = [
  "field_key",
  "label_ja",
  "input_kind",
  "is_editable",
  "sort_order",
  "spec_version"
];

const CODE_HEADERS = ["field_key", "code", "name_ja", "is_active"];

const INPUT_KINDS = new Set(["text", "number", "code", "id", "readonly"]);

function normalizeHeader(value: string, index: number): string {
  const trimmed = value.trim();
  if (index === 0) {
    return trimmed.replace(/^\uFEFF/, "");
  }
  return trimmed;
}

function parseBooleanLike(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (["true", "1"].includes(normalized)) {
    return true;
  }
  if (["false", "0"].includes(normalized)) {
    return false;
  }
  return null;
}

function hasHeaderMismatch(headers: string[], expected: string[]): boolean {
  if (headers.length !== expected.length) {
    return true;
  }
  return headers.some((header, index) => header !== expected[index]);
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "");
}

export function parseAirworkFieldsCsv(text: string): {
  entries: AirworkFieldInput[];
  errors: CsvError[];
} {
  const { rows, rowLineNumbers } = parseCsv(text);
  const errors: CsvError[] = [];

  if (rows.length === 0) {
    return {
      entries: [],
      errors: [{ line: 1, message: "CSVにデータ行がありません。" }]
    };
  }

  const header = rows[0].map((value, index) => normalizeHeader(value, index));
  if (hasHeaderMismatch(header, FIELD_HEADERS)) {
    return {
      entries: [],
      errors: [
        {
          line: rowLineNumbers[0] ?? 1,
          message: `ヘッダーが不正です。期待値: ${FIELD_HEADERS.join(", ")}`
        }
      ]
    };
  }

  const entries: AirworkFieldInput[] = [];

  rows.slice(1).forEach((row, index) => {
    if (isRowEmpty(row)) {
      return;
    }

    const line = rowLineNumbers[index + 1] ?? index + 2;
    if (row.length !== FIELD_HEADERS.length) {
      errors.push({
        line,
        message: `列数が一致しません (期待値: ${FIELD_HEADERS.length})。`
      });
      return;
    }

    const [fieldKey, labelJa, inputKindRaw, isEditableRaw, sortOrderRaw, specVersion] =
      row.map((value) => value.trim());

    if (!fieldKey) {
      errors.push({ line, message: "field_key は必須です。" });
    }
    if (!labelJa) {
      errors.push({ line, message: "label_ja は必須です。" });
    }

    if (!INPUT_KINDS.has(inputKindRaw)) {
      errors.push({
        line,
        message: "input_kind は text/number/code/id/readonly のいずれかです。"
      });
    }

    const isEditable = parseBooleanLike(isEditableRaw);
    if (isEditable === null) {
      errors.push({
        line,
        message: "is_editable は true/false/1/0 で指定してください。"
      });
    }

    const sortOrderNumber = Number(sortOrderRaw);
    if (!Number.isFinite(sortOrderNumber) || !Number.isInteger(sortOrderNumber)) {
      errors.push({
        line,
        message: "sort_order は整数で指定してください。"
      });
    }

    if (!specVersion) {
      errors.push({ line, message: "spec_version は必須です。" });
    }

    if (errors.some((error) => error.line === line)) {
      return;
    }

    entries.push({
      fieldKey,
      labelJa,
      inputKind: inputKindRaw as AirworkFieldInput["inputKind"],
      isEditable: isEditable ?? false,
      sortOrder: sortOrderNumber,
      specVersion
    });
  });

  return { entries, errors };
}

export function parseAirworkCodesCsv(text: string): {
  entries: AirworkCodeInput[];
  errors: CsvError[];
} {
  const { rows, rowLineNumbers } = parseCsv(text);
  const errors: CsvError[] = [];

  if (rows.length === 0) {
    return {
      entries: [],
      errors: [{ line: 1, message: "CSVにデータ行がありません。" }]
    };
  }

  const header = rows[0].map((value, index) => normalizeHeader(value, index));
  if (hasHeaderMismatch(header, CODE_HEADERS)) {
    return {
      entries: [],
      errors: [
        {
          line: rowLineNumbers[0] ?? 1,
          message: `ヘッダーが不正です。期待値: ${CODE_HEADERS.join(", ")}`
        }
      ]
    };
  }

  const entries: AirworkCodeInput[] = [];

  rows.slice(1).forEach((row, index) => {
    if (isRowEmpty(row)) {
      return;
    }

    const line = rowLineNumbers[index + 1] ?? index + 2;
    if (row.length !== CODE_HEADERS.length) {
      errors.push({
        line,
        message: `列数が一致しません (期待値: ${CODE_HEADERS.length})。`
      });
      return;
    }

    const [fieldKey, code, nameJa, isActiveRaw] = row.map((value) => value.trim());

    if (!fieldKey) {
      errors.push({ line, message: "field_key は必須です。" });
    }
    if (!code) {
      errors.push({ line, message: "code は必須です。" });
    }
    if (!nameJa) {
      errors.push({ line, message: "name_ja は必須です。" });
    }

    const isActive = parseBooleanLike(isActiveRaw);
    if (isActive === null) {
      errors.push({
        line,
        message: "is_active は true/false/1/0 で指定してください。"
      });
    }

    if (errors.some((error) => error.line === line)) {
      return;
    }

    entries.push({
      fieldKey,
      code,
      nameJa,
      isActive: isActive ?? false
    });
  });

  return { entries, errors };
}
