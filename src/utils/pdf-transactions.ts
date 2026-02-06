import * as pdfjsLib from "pdfjs-dist";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export type PdfExtractedTransaction = {
  date: string; // dd/MM/yyyy
  description: string;
  value: number; 
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

const parsePtBrNumber = (raw: string) => {
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const val = Number.parseFloat(cleaned);
  return Number.isFinite(val) ? val : NaN;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDdMmYyyy(dd: number, mm: number, yyyy: number) {
  return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
}

const monthMap: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, março: 3, marco: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

function detectLikelyYear(text: string): number {
  const years = Array.from(text.matchAll(/\b(20\d{2})\b/g)).map((m) => Number(m[1]));
  if (years.length === 0) return new Date().getFullYear();
  const freq = new Map<number, number>();
  for (const y of years) freq.set(y, (freq.get(y) ?? 0) + 1);
  let bestYear = years[0], bestCount = 0;
  for (const [y, c] of freq.entries()) {
    if (c > bestCount) { bestYear = y; bestCount = c; }
  }
  return bestYear;
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
      .map((it) => ({
        str: String(it.str || "").trim(),
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
      }))
      .filter((i) => i.str);

    fullText += " " + items.map((i) => i.str).join(" ");

    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    const yBucket = (y: number) => Math.round(y / 3) * 3; // Bucket levemente maior para agrupar melhor

    for (const it of items) {
      const key = yBucket(it.y);
      const existing = rowMap.get(key);
      if (!existing) rowMap.set(key, { y: it.y, parts: [{ x: it.x, str: it.str }] });
      else existing.parts.push({ x: it.x, str: it.str });
    }

    const rows = Array.from(rowMap.values())
      .sort((a, b) => b.y - a.y) // Topo para baixo
      .map((row) =>
        row.parts
          .sort((a, b) => a.x - b.x) // Esquerda para direita
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

  for (const line of lines) {
    let dateStr = "";
    let value = NaN;
    let rest = line;

    // 1. Tentar capturar DATA no início
    // Case A: 19 DE AGO. 2025
    const longDateMatch = rest.match(/^(\d{1,2})\s+DE\s+([A-ZÀ-ÿ.]+)\.?\s+(\d{4})\s+(.*)$/i);
    if (longDateMatch) {
      const dd = Number(longDateMatch[1]);
      const mm = monthMap[longDateMatch[2].toLowerCase().replace(".", "")];
      const yyyy = Number(longDateMatch[3]);
      if (mm) {
        dateStr = toDdMmYyyy(dd, mm, yyyy);
        rest = longDateMatch[4];
      }
    } else {
      // Case B: 01/07
      const shortDateMatch = rest.match(/^(\d{2})\/(\d{2})\s+(.*)$/);
      if (shortDateMatch) {
        dateStr = toDdMmYyyy(Number(shortDateMatch[1]), Number(shortDateMatch[2]), likelyYear);
        rest = shortDateMatch[3];
      } else {
        // Case C: dd/MM/yyyy
        const fullDateMatch = rest.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*)$/);
        if (fullDateMatch) {
          dateStr = fullDateMatch[1];
          rest = fullDateMatch[2];
        }
      }
    }

    if (!dateStr) continue;

    // 2. Tentar capturar VALOR no final (ex: R$ 35,00 ou - R$ 270,83)
    // Procuramos por algo que comece com R$ ou apenas números no fim
    const moneyMatch = rest.match(/(?:-\s+)?R\$\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})$/i) || 
                       rest.match(/\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/);
    
    if (moneyMatch) {
      value = parsePtBrNumber(moneyMatch[1]);
      // A descrição é o que sobrou entre a data e o valor
      rest = rest.replace(moneyMatch[0], "");
    }

    // 3. Limpar Descrição
    // Remove hífens isolados (coluna vazia do Inter) e espaços extras
    let description = normalizeSpaces(rest.replace(/\s-\s/g, " ").replace(/^-/, "").replace(/-$/, ""));

    if (dateStr && description && !isNaN(value)) {
      extracted.push({
        date: dateStr,
        description: description,
        value: Math.abs(value)
      });
    }
  }

  // Remove duplicados exatos
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}