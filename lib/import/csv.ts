// Minimal RFC 4180 CSV parser with delimiter detection (Italian bank exports often use ';').

const CANDIDATES = [";", ",", "\t", "|"] as const;

/** Picks the delimiter that splits the first lines into the most consistent column count. */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  let best: string = ",";
  let bestScore = 0;
  for (const d of CANDIDATES) {
    const counts = lines.map((l) => splitLine(l, d).length);
    const max = Math.max(0, ...counts);
    if (max < 2) continue;
    // Rows sharing the widest column count; preambles in bank exports are narrower.
    const score = counts.filter((c) => c === max).length * max;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/** Splits a single line honouring quotes (used only for detection). */
function splitLine(line: string, delimiter: string): string[] {
  return parseCsv(line, delimiter)[0] ?? [];
}

/** Parses CSV text into rows of trimmed strings; handles BOM, quotes, escaped quotes and CRLF. */
export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field.trim());
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) endField();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}
