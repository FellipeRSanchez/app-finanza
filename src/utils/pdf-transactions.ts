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

const monthAbbr: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parsePtBrNumber(raw: string): number {
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

    // Agrupar por linha (Y) com tolerância
    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      const key = Math.round(it.y / 3) * 3;
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

  const years = Array.from(fullText.matchAll(/\b(20\d{2})\b/g)).map(m => Number(m[1]));
  const likelyYear = years.length > 0 ? [...new Set(years)].sort((a,b) => b-a)[0] : new Date().getFullYear();

  const extracted: PdfExtractedTransaction[] = [];

  for (const line of lines) {
    // 1. Limpeza do hífen de coluna vazia (Inter)
    let cleanLine = line.replace(/\s-\s/g, " ");
    
    // 2. Tentar extrair Data
    let dateStr = "";
    let dateMatch: any = null;

    // Caso Inter: "19 DE AGO. 2025" ou "19 DE AGOSTO 2025"
    const interDateRegex = /(\d{1,2})\s+DE\s+([A-ZÀ-ÿ]{3,})\.?\s+(\d{4})/i;
    dateMatch = cleanLine.match(interDateRegex);
    if (dateMatch) {
      const dd = Number(dateMatch[1]);
      const mStr = dateMatch[2].toLowerCase().substring(0, 3);
      const mm = monthAbbr[mStr];
      const yyyy = Number(dateMatch[3]);
      if (mm) {
        dateStr = `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
        cleanLine = cleanLine.replace(dateMatch[0], "");
      }
    } else {
      // Caso MP: "01/07"
      const shortDateRegex = /(\d{2})\/(\d{2})/;
      dateMatch = cleanLine.match(shortDateRegex);
      if (dateMatch) {
        dateStr = `${dateMatch[1]}/${dateMatch[2]}/${likelyYear}`;
        cleanLine = cleanLine.replace(dateMatch[0], "");
      }
    }

    if (!dateStr) continue;

    // 3. Tentar extrair Valor (Procurando do final da linha para o início)
    // O valor geralmente vem como "R$ 35,00" ou apenas "35,00"
    const moneyRegex = /(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2})/i;
    const moneyMatches = Array.from(cleanLine.matchAll(new RegExp(moneyRegex, 'gi')));
    
    if (moneyMatches.length > 0) {
      // Pegamos o último match da linha (geralmente é o valor da transação)
      const lastMatch = moneyMatches[moneyMatches.length - 1];
      const value = parsePtBrNumber(lastMatch[1]);
      let description = cleanLine.replace(lastMatch[0], "").trim();
      
      // Limpezas finais na descrição
      description = normalizeSpaces(description)
        .replace(/^-/, "")
        .replace(/-$/, "")
        .trim();

      if (description.length > 1 && !isNaN(value)) {
        extracted.push({
          date: dateStr,
          description: description,
          value: Math.abs(value)
        });
      }
    }
  }

  // Dedup
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}