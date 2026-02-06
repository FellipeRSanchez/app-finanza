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

const BLACKLIST = [
  "PAGAMENTO EFETUADO", "SALDO ANTERIOR", "TOTAL DA FATURA", "LIMITE", 
  "ENCARGOS", "IOF", "JUROS", "VALOR EM REAIS", "CADA PONTO", "RESUMO",
  "PAGAMENTO RECEBIDO", "EXTRATO"
];

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

    // Agrupar por linha (Y) com tolerância de 4px
    const rowMap = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      const key = Math.round(it.y / 4) * 4;
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
    // 1. FILTRAGEM DE LIXO
    const upperLine = line.toUpperCase();
    if (BLACKLIST.some(word => upperLine.includes(word))) continue;

    // 2. LIMPEZA DE SEPARADORES (o "-" do Inter)
    let cleanLine = line.replace(/\s-\s/g, " ");
    cleanLine = normalizeSpaces(cleanLine);

    // 3. EXTRAÇÃO DE DATA
    let dateStr = "";
    
    // Pattern Inter: "19 DE AGO. 2025"
    const interDateMatch = cleanLine.match(/(\d{1,2})\s+DE\s+([A-ZÀ-ÿ]{3,})\.?\s+(\d{4})/i);
    if (interDateMatch) {
      const dd = Number(interDateMatch[1]);
      const mStr = interDateMatch[2].toLowerCase().substring(0, 3);
      const mm = monthAbbr[mStr];
      const yyyy = Number(interDateMatch[3]);
      if (mm) dateStr = `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
    } else {
      // Pattern MP: "01/07"
      const shortDateMatch = cleanLine.match(/(\d{2})\/(\d{2})/);
      if (shortDateMatch) {
        dateStr = `${shortDateMatch[1]}/${shortDateMatch[2]}/${likelyYear}`;
      }
    }

    if (!dateStr) continue;

    // 4. EXTRAÇÃO DE VALOR
    // Procura o formato XX,XX ou X.XXX,XX no final da linha
    const moneyMatch = cleanLine.match(/(-?\d{1,3}(\.\d{3})*,\d{2})$/);
    if (moneyMatch) {
      const valueStr = moneyMatch[1];
      const value = parsePtBrNumber(valueStr);
      
      // A descrição é o que sobrou entre a data e o valor
      let description = cleanLine
        .replace(interDateMatch ? interDateMatch[0] : /(\d{2})\/(\d{2})/, "")
        .replace(valueStr, "")
        .replace(/R\$/g, "")
        .trim();

      // Limpeza final da descrição (remove lixos como hífens repetidos)
      description = normalizeSpaces(description.replace(/^[\s\-\.]+/, "").replace(/[\s\-\.]+$/, ""));

      if (description.length > 2 && !isNaN(value)) {
        extracted.push({
          date: dateStr,
          description: description,
          value: Math.abs(value)
        });
      }
    }
  }

  // Dedup final
  const uniq = new Map<string, PdfExtractedTransaction>();
  for (const t of extracted) {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.value.toFixed(2)}`;
    if (!uniq.has(key)) uniq.set(key, t);
  }

  return Array.from(uniq.values());
}