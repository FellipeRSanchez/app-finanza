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
  // Normaliza "R$ 1.234,56" para "R$" e "1.234,56" (tokens separados)
  // e também casos como "R$1.234,56"
  const normalized = text
    .replace(/R\$\s*/g, "R$ ")
    .replace(/R\$\s+(-?\d)/g, "R$ $1")
    .replace(/R\$\s?(-?\d)/g, "R$ $1");

  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
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

  // 1) Tentativa por linha (melhor quando a tabela vem "inteira")
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
      if (isLikelyDateDDMMYYYY(date) && description && Number.isFinite(value)) {
        extractedLineBased.push({ date, description, value: Math.abs(value) });
      }
      continue;
    }

    // dd/MM ... valor  => completa ano
    const matchNoYear = line.match(
      /^(\d{2}\/\d{2})\s+(.*)\s+(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/,
    );
    if (matchNoYear) {
      const [dd, mm] = matchNoYear[1].split("/").map(Number);
      const date = toDdMmYyyy(dd, mm, likelyYear);
      const description = normalizeSpaces(matchNoYear[2]);
      const value = parsePtBrNumber(matchNoYear[3]);
      if (description && Number.isFinite(value)) {
        extractedLineBased.push({ date, description, value: Math.abs(value) });
      }
    }
  }

  // 2) Fallback por tokens sequenciais (melhor quando PDF quebra as colunas)
  const extractedTokenBased: PdfExtractedTransaction[] = [];
  if (extractedLineBased.length === 0) {
    const allTokens = tokenizePreservingMoney(normalizeSpaces(lines.join(" ")));

    let i = 0;
    while (i < allTokens.length) {
      const t = allTokens[i];

      const isDateToken = isLikelyDateDDMMYYYY(t) || isLikelyDateDDMM(t);
      if (!isDateToken) {
        i++;
        continue;
      }

      let dateStr = t;
      if (isLikelyDateDDMM(dateStr)) {
        const [dd, mm] = dateStr.split("/").map(Number);
        dateStr = toDdMmYyyy(dd, mm, likelyYear);
      }

      // avança para coletar descrição até achar valor (ignora "R$")
      i++;

      const descParts: string[] = [];
      let valueStr: string | null = null;

      while (i < allTokens.length) {
        const tok = allTokens[i];

        // se achar outra data antes do valor, aborta este registro
        if (isLikelyDateDDMMYYYY(tok) || isLikelyDateDDMM(tok)) break;

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

      if (isLikelyDateDDMMYYYY(dateStr) && description && Number.isFinite(value)) {
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