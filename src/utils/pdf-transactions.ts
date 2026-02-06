import * as pdfjsLib from "pdfjs-dist";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export type PdfExtractedTransaction = {
  date: string; 
  description: string;
  value: number; 
};

const monthMap: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parsePtBrNumber(raw: string): number {
  // Limpa R$, pontos de milhar e converte vírgula decimal
  const cleaned = raw
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
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

    const items = (content.items as any[]).map((it) => ({
      str: String(it.str || "").trim(),
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0,
    })).filter((i) => i.str);

    fullText += " " + items.map(i => i.str).join(" ");

    // Agrupa por Y (linha) com uma tolerância maior (5px)
    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      const key = Math.round(it.y / 5) * 5;
      const existing = rowMap.get(key);
      if (!existing) rowMap.set(key, { y: it.y, parts: [{ x: it.x, str: it.str }] });
      else existing.parts.push({ x: it.x, str: it.str });
    }

    const rows = Array.from(rowMap.values())
      .sort((a, b) => b.y - a.y)
      .map((row) => row.parts.sort((a, b) => a.x - b.x).map((p) => p.str).join(" "));

    rows.forEach((r) => {
      const line = normalizeSpaces(r);
      if (line) lines.push(line);
    });
  }

  // Detecta o ano mais comum no documento
  const years = Array.from(fullText.matchAll(/\b(20\d{2})\b/g)).map(m => Number(m[1]));
  const likelyYear = years.length > 0 ? [...new Set(years)].sort((a,b) => b-a)[0] : new Date().getFullYear();

  const extracted: PdfExtractedTransaction[] = [];

  for (const line of lines) {
    // 1. LIMPEZA INICIAL
    // Remove o hífen isolado (comum no Inter em colunas vazias)
    let cleanLine = line.replace(/\s-\s/g, " "); 
    cleanLine = normalizeSpaces(cleanLine);

    let dateStr = "";
    let value = NaN;
    let description = "";

    // 2. EXTRAÇÃO DE DATA (No início da linha)
    // Caso A: 19 DE AGO. 2025 ou 19 DE AGOSTO 2025
    const longDateMatch = cleanLine.match(/^(\d{1,2})\s+DE\s+([A-ZÀ-ÿ.]+)\s+(\d{4})/i);
    if (longDateMatch) {
      const dd = Number(longDateMatch[1]);
      const monthKey = longDateMatch[2].toLowerCase().replace(".", "");
      const mm = monthMap[monthKey];
      const yyyy = Number(longDateMatch[3]);
      if (mm) {
        dateStr = `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
        cleanLine = cleanLine.replace(longDateMatch[0], "");
      }
    } 
    // Caso B: 01/07
    else {
      const shortDateMatch = cleanLine.match(/^(\d{2})\/(\d{2})/);
      if (shortDateMatch) {
        dateStr = `${shortDateMatch[1]}/${shortDateMatch[2]}/${likelyYear}`;
        cleanLine = cleanLine.replace(shortDateMatch[0], "");
      }
    }

    if (!dateStr) continue;

    // 3. EXTRAÇÃO DE VALOR (No final da linha)
    // Padrão: R$ 35,00 ou 1.234,56 ou 270,83
    const moneyMatch = cleanLine.match(/(R\$\s*)?(-?\d{1,3}(\.\d{3})*,\d{2})$/i);
    if (moneyMatch) {
      value = parsePtBrNumber(moneyMatch[2]);
      description = cleanLine.replace(moneyMatch[0], "");
    }

    // 4. VALIDAÇÃO FINAL
    description = normalizeSpaces(description);
    // Remove hífens que sobraram no final da descrição
    description = description.replace(/-$/, "").trim();

    if (dateStr && description.length > 2 && !isNaN(value)) {
      extracted.push({
        date: dateStr,
        description: description,
        value: Math.abs(value)
      });
    }
  }

  // Dedup por chave única
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}