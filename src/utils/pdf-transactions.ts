import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PdfExtractedTransaction = {
  date: string; // dd/MM/yyyy
  description: string;
  value: number; // positivo no PDF (normalmente)
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

const parsePtBrNumber = (raw: string) => {
  // Aceita: 1.234,56 | 123,45 | 123.45
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const val = Number.parseFloat(cleaned);
  return Number.isFinite(val) ? val : NaN;
};

const isLikelyDate = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);

const isLikelyMoney = (s: string) =>
  /-?\d{1,3}(\.\d{3})*,\d{2}$/.test(s) || /-?\d+,\d{2}$/.test(s);

export async function extractTransactionsFromPdf(file: File): Promise<PdfExtractedTransaction[]> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Monta "linhas" tentando respeitar quebras visuais:
    // Agrupa por Y aproximado (mesma linha) e ordena por X.
    const items = (content.items as any[]).map((it) => {
      const str = normalizeSpaces(String(it.str || ""));
      const transform = it.transform as number[] | undefined;
      const x = transform?.[4] ?? 0;
      const y = transform?.[5] ?? 0;
      return { str, x, y };
    }).filter((i) => i.str);

    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();

    const yBucket = (y: number) => Math.round(y / 2) * 2; // granularidade simples

    for (const it of items) {
      const key = yBucket(it.y);
      const existing = rowMap.get(key);
      if (!existing) {
        rowMap.set(key, { y: it.y, parts: [{ x: it.x, str: it.str }] });
      } else {
        existing.parts.push({ x: it.x, str: it.str });
      }
    }

    const rows = Array.from(rowMap.values())
      .sort((a, b) => b.y - a.y)
      .map((row) => row.parts.sort((a, b) => a.x - b.x).map((p) => p.str).join(" "));

    rows.forEach((r) => {
      const line = normalizeSpaces(r);
      if (line) lines.push(line);
    });
  }

  // Heurística principal:
  // Procurar linhas no formato:
  // DD/MM/YYYY ... VALOR
  // onde VALOR é pt-BR com ,00
  const extracted: PdfExtractedTransaction[] = [];

  for (const line of lines) {
    // Ex: "12/11/2025 SUPERMERCADO XYZ 123,45"
    const match = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*)\s+(-?\d{1,3}(\.\d{3})*,\d{2}|\-?\d+,\d{2})$/);
    if (!match) continue;

    const date = match[1];
    const description = normalizeSpaces(match[2]);
    const valueStr = match[3];
    const value = parsePtBrNumber(valueStr);

    if (!isLikelyDate(date) || !description || !Number.isFinite(value)) continue;

    extracted.push({ date, description, value: Math.abs(value) });
  }

  // Fallback (caso alguns PDFs venham quebrando em tokens):
  // Se não achou nada, tenta leitura tokenizada:
  if (extracted.length === 0) {
    for (const line of lines) {
      const tokens = line.split(" ").filter(Boolean);
      if (tokens.length < 3) continue;

      const first = tokens[0];
      const last = tokens[tokens.length - 1];

      if (!isLikelyDate(first) || !isLikelyMoney(last)) continue;

      const value = parsePtBrNumber(last);
      const description = normalizeSpaces(tokens.slice(1, -1).join(" "));

      if (!description || !Number.isFinite(value)) continue;
      extracted.push({ date: first, description, value: Math.abs(value) });
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