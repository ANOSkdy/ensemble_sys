import "server-only";

export type ParsedCsv = {
  rows: string[][];
  rowLineNumbers: number[];
};

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  const rowLineNumbers: number[] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    const hasContent = row.some((cell) => cell.length > 0);
    if (hasContent) {
      rows.push(row);
      rowLineNumbers.push(rowStartLine);
    }
    row = [];
    rowStartLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      if (inQuotes) {
        field += "\n";
      } else {
        pushRow();
      }
      line += 1;
      continue;
    }

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      pushField();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return { rows, rowLineNumbers };
}
