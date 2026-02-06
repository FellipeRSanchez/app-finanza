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
  // Aceita: 1.234,56 | 123,45 | 123.45 | -123,45 | R$ 123,45 | - R$ 123,45
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const val = Number.parseFloat(cleaned);
  return Number.isFinite(val) ? val : NaN;
};

const isLikelyDateDDMMYYYY = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
const isLikelyDateDDMM = (s: string) => /^\d{2}\/\d{2}$/.test(s);

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

function parseLongPtBrDateFromLineStart(line: string): { date: string; rest: string } | null {
  // Ex: "19 DE AGO. 2025 ZARA..." (case-insensitive)
  const m = line.match(/^(\d{1,2})\s+de\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})\s+(.*)$/i);
  if (!m) return null;

  const dd = Number(m[1]);
  const monthKey = m[2].toLowerCase().replace(".", "");
  const yyyy = Number(m[3]);
  const mm = monthMap[monthKey];
  if (!mm) return null;

  return { date: toDdMmYyyy(dd, mm, yyyy), rest: m[4] };
}

function parseDdMmFromLineStart(line: string, likelyYear: number): { date: string; rest: string } | null {
  // Ex: "01/07 MERCADOPAGO..."
  const m = line.match(/^(\d{2})\/(\d{2})\s+(.*)$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  return { date: toDdMmYyyy(dd, mm, likelyYear), rest: m[3] };
}

function parseMoneyAtLineEnd(rest: string): { description: string; value: number } | null {
  // Aceita finais como:
  // "... R$ 35,00"
  // "... - R$ 270,83"
  // "... -270,83"
  // "... 270,83"
  const s = normalizeSpaces(rest);

  // 1) "- R$ 270,83"
  let m = s.match(/^(.*)\s-\sR\$\s(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/i);
  if (m) {
    const description = normalizeSpaces(m[1]);
    const value = -Math.abs(parsePtBrNumber(m[2]));
    if (description && Number.isFinite(value)) return { description, value };
  }

  // 2) "R$ 35,00" (positivo)
  m = s.match(/^(.*)\sR\$\s(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/i);
  if (m) {
    const description = normalizeSpaces(m[1]);
    const value = parsePtBrNumber(m[2]);
    if (description && Number.isFinite(value)) return { description, value };
  }

  // 3) "-270,83" ou "270,83" como último token
  m = s.match(/^(.*)\s(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2}|\-?\d+\.\d{2})$/);
  if (m) {
    const description = normalizeSpaces(m[1]);
    const value = parsePtBrNumber(m[2]);
    if (description && Number.isFinite(value)) return { description, value };
  }

  return null;
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

  const extracted: PdfExtractedTransaction[] = [];

  for (const rawLine of lines) {
    const line = normalizeSpaces(rawLine);
    if (!line) continue;

    // 1) Data por extenso (Inter): "19 DE AGO. 2025 ..."
    const longDate = parseLongPtBrDateFromLineStart(line);
    if (longDate) {
      const money = parseMoneyAtLineEnd(longDate.rest);
      if (money && !isJunkDescription(money.description)) {
        extracted.push({
          date: longDate.date,
          description: money.description,
          value: Math.abs(money.value),
        });
      }
      continue;
    }

    // 2) Data dd/MM (Mercado Pago): "01/07 ..."
    const shortDate = parseDdMmFromLineStart(line, likelyYear);
    if (shortDate) {
      const money = parseMoneyAtLineEnd(shortDate.rest);
      if (money && !isJunkDescription(money.description)) {
        extracted.push({
          date: shortDate.date,
          description: money.description,
          value: Math.abs(money.value),
        });
      }
      continue;
    }

    // 3) Data dd/MM/yyyy no começo (alguns bancos)
    const fullDate = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*)$/);
    if (fullDate && isLikelyDateDDMMYYYY(fullDate[1])) {
      const money = parseMoneyAtLineEnd(fullDate[2]);
      if (money && !isJunkDescription(money.description)) {
        extracted.push({
          date: fullDate[1],
          description: money.description,
          value: Math.abs(money.value),
        });
      }
    }
  }

  // Remove duplicados internos do PDF (mesma data/desc/valor)
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}