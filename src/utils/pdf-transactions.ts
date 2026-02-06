import * as pdfjsLib from "pdfjs-dist";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export type PdfExtractedTransaction = {
  date: string; // dd/MM/yyyy
  description: string;
  value: number; // positivo no PDF (normalmente)
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

const parsePtBrNumber = (raw: string) => {
  // Aceita: 1.234,56 | 123,45 | 123.45 | -123,45 | R$ 123,45
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const val = Number.parseFloat(cleaned);
  return Number.isFinite(val) ? val : NaN;
};

const isLikelyDateDDMMYYYY = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
const isLikelyDateDDMM = (s: string) => /^\d{2}\/\d{2}$/.test(s);

const isLikelyMoneyToken = (s: string) => {
  const t = s.trim();
  if (!t) return false;
  if (t === "R$" || t.toUpperCase() === "RS") return false;
  return (
    /-?\d{1,3}(\.\d{3})*,\d{2}$/.test(t) ||
    /-?\d+,\d{2}$/.test(t) ||
    /-?\d+(\.\d{2})$/.test(t)
  );
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDdMmYyyy(dd: number, mm: number, yyyy: number) {
  return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
}

function detectLikelyYear(text: string): number {
  const years = Array.from(text.matchAll(/\b(20\d{2})\b/g)).map((m) => Number(m[1]));
  if (years.length === 0) return new Date().getFullYear();

  const freq = new Map<number, number>();
  for (const y of years) freq.set(y, (freq.get(y) ?? 0) + 1);

  let bestYear = years[0];
  let bestCount = 0;
  for (const [y, c] of freq.entries()) {
    if (c > bestCount) {
      bestYear = y;
      bestCount = c;
    }
  }
  return bestYear;
}

function tokenizePreservingMoney(text: string) {
  const normalized = text
    .replace(/R\$\s*/g, "R$ ")
    .replace(/R\$\s+(-?\d)/g, "R$ $1")
    .replace(/R\$\s?(-?\d)/g, "R$ $1");

  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const monthMap: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  março: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

function parsePtBrLongDateTokenSequence(tokens: string[], startIndex: number): { date: string; nextIndex: number } | null {
  // Aceita: "19 de ago. 2025" ou "19 de ago 2025"
  // tokens: [ "19", "de", "ago.", "2025" ]
  const ddRaw = tokens[startIndex];
  const maybeDe = tokens[startIndex + 1];
  const monthRaw = tokens[startIndex + 2];
  const yyyyRaw = tokens[startIndex + 3];

  if (!ddRaw || !maybeDe || !monthRaw || !yyyyRaw) return null;
  if (!/^\d{1,2}$/.test(ddRaw)) return null;
  if (maybeDe.toLowerCase() !== "de") return null;
  if (!/^\d{4}$/.test(yyyyRaw)) return null;

  const dd = Number(ddRaw);
  const yyyy = Number(yyyyRaw);
  const monthKey = monthRaw.toLowerCase().replace(".", "");
  const mm = monthMap[monthKey];
  if (!mm) return null;

  return { date: toDdMmYyyy(dd, mm, yyyy), nextIndex: startIndex + 4 };
}

function isJunkDescription(desc: string) {
  const d = desc.toLowerCase();
  if (d.length < 3) return true;
  const junk = [
    "data",
    "descrição",
    "descricao",
    "valor",
    "saldo",
    "lancamentos",
    "lançamentos",
    "movimentações",
    "movimentacoes",
    "extrato",
    "total",
    "crédito",
    "credito",
    "débito",
    "debito",
    "resumo",
  ];
  return junk.includes(d) || junk.some((j) => d === j);
}

export async function extractTransactionsFromPdf(file: File): Promise<PdfExtractedTransaction[]> {
  const buf = await file.arrayBuffer();
  const loadingTask = (pdfjsLib as any).getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  const lines: string[] = [];
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = (content.items as any[])
      .map((it) => {
        const str = normalizeSpaces(String(it.str || ""));
        const transform = it.transform as number[] | undefined;
        const x = transform?.[4] ?? 0;
        const y = transform?.[5] ?? 0;
        return { str, x, y };
      })
      .filter((i) => i.str);

    fullText += " " + items.map((i) => i.str).join(" ");

    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    const yBucket = (y: number) => Math.round(y / 2) * 2;

    for (const it of items) {
      const key = yBucket(it.y);
      const existing = rowMap.get(key);
      if (!existing) rowMap.set(key, { y: it.y, parts: [{ x: it.x, str: it.str }] });
      else existing.parts.push({ x: it.x, str: it.str });
    }

    const rows = Array.from(rowMap.values())
      .sort((a, b) => b.y - a.y)
      .map((row) =>
        row.parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" "),
      );

    rows.forEach((r) => {
      const line = normalizeSpaces(r);
      if (line) lines.push(line);
    });
  }

  const likelyYear = detectLikelyYear(fullText);

  // 1) Tentativa por linha (quando a linha já vem certinha)
  const extractedLineBased: PdfExtractedTransaction[] = [];

  for (const line of lines) {
    // dd/MM/yyyy ... valor
    const matchFull = line.match(
      /^(\d{2}\/\d{2}\/\d{4})\s+(.*)\s+(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/,
    );
    if (matchFull) {
      const date = matchFull[1];
      const description = normalizeSpaces(matchFull[2]);
      const value = parsePtBrNumber(matchFull[3]);
      if (isLikelyDateDDMMYYYY(date) && description && !isJunkDescription(description) && Number.isFinite(value)) {
        extractedLineBased.push({ date, description, value: Math.abs(value) });
      }
      continue;
    }

    // dd/MM ... valor => completa ano provável
    const matchNoYear = line.match(
      /^(\d{2}\/\d{2})\s+(.*)\s+(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/,
    );
    if (matchNoYear) {
      const [dd, mm] = matchNoYear[1].split("/").map(Number);
      const date = toDdMmYyyy(dd, mm, likelyYear);
      const description = normalizeSpaces(matchNoYear[2]);
      const value = parsePtBrNumber(matchNoYear[3]);
      if (description && !isJunkDescription(description) && Number.isFinite(value)) {
        extractedLineBased.push({ date, description, value: Math.abs(value) });
      }
      continue;
    }

    // "19 de ago. 2025 ... 123,45"
    const matchLong = line.match(
      /^(\d{1,2})\s+de\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})\s+(.*)\s+(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/,
    );
    if (matchLong) {
      const dd = Number(matchLong[1]);
      const monthKey = matchLong[2].toLowerCase().replace(".", "");
      const yyyy = Number(matchLong[3]);
      const mm = monthMap[monthKey];
      const description = normalizeSpaces(matchLong[4]);
      const value = parsePtBrNumber(matchLong[5]);
      if (mm && description && !isJunkDescription(description) && Number.isFinite(value)) {
        extractedLineBased.push({ date: toDdMmYyyy(dd, mm, yyyy), description, value: Math.abs(value) });
      }
    }
  }

  // 2) Parser sequencial por tokens (quando a tabela vem quebrada)
  const extractedTokenBased: PdfExtractedTransaction[] = [];
  if (extractedLineBased.length === 0) {
    const allTokens = tokenizePreservingMoney(normalizeSpaces(lines.join(" ")));

    let i = 0;
    while (i < allTokens.length) {
      let dateStr: string | null = null;
      let nextIndex = i;

      // dd/MM/yyyy
      if (isLikelyDateDDMMYYYY(allTokens[i])) {
        dateStr = allTokens[i];
        nextIndex = i + 1;
      } else if (isLikelyDateDDMM(allTokens[i])) {
        // dd/MM
        const [dd, mm] = allTokens[i].split("/").map(Number);
        dateStr = toDdMmYyyy(dd, mm, likelyYear);
        nextIndex = i + 1;
      } else {
        // dd de mmm. yyyy
        const longDate = parsePtBrLongDateTokenSequence(allTokens, i);
        if (longDate) {
          dateStr = longDate.date;
          nextIndex = longDate.nextIndex;
        }
      }

      if (!dateStr) {
        i++;
        continue;
      }

      i = nextIndex;

      const descParts: string[] = [];
      let valueStr: string | null = null;

      while (i < allTokens.length) {
        const tok = allTokens[i];

        // Se aparecer outra "data" antes do valor, aborta esta tentativa.
        if (isLikelyDateDDMMYYYY(tok) || isLikelyDateDDMM(tok) || parsePtBrLongDateTokenSequence(allTokens, i)) {
          break;
        }

        if (tok === "R$") {
          i++;
          continue;
        }

        if (isLikelyMoneyToken(tok)) {
          valueStr = tok;
          i++;
          break;
        }

        descParts.push(tok);
        i++;
      }

      const description = normalizeSpaces(descParts.join(" "));
      const value = valueStr ? parsePtBrNumber(valueStr) : NaN;

      if (dateStr && isLikelyDateDDMMYYYY(dateStr) && description && !isJunkDescription(description) && Number.isFinite(value)) {
        extractedTokenBased.push({ date: dateStr, description, value: Math.abs(value) });
      }
    }
  }

  const extracted = extractedLineBased.length > 0 ? extractedLineBased : extractedTokenBased;

  // Remove duplicados internos do PDF (mesma data/desc/valor)
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}