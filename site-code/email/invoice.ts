// Mint Timepieces wire invoice PDF, in the same design language as the emails.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { LOGO } from "./mail.ts";

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const K = { mint: hex("#DEE6DA"), deep: hex("#313630"), soft: hex("#5A6158"), muted: hex("#7A8278"), brass: hex("#C9A362"), brassText: hex("#A56F18"), line: hex("#E4E8E1"), page: hex("#F4F5F2"), cream: hex("#F4F5F2"), white: hex("#FFFFFF") };
const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-400-normal.ttf",
  semibold: "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-600-normal.ttf",
  bold: "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-700-normal.ttf",
};

async function bytes(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}
const isPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50;
const isJpg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8;

export interface InvoiceData {
  number: string; issued: string; heldUntil: string;
  legalName: string; address: string; email: string; mobile?: string | null;
  title: string; reference?: string | null; image?: string | null;
  listed: number; deliveryLabel: string; taxed: boolean; tax: number; total: number;
  wireInstructions: string; deposit?: number | null; useTax?: string | null;
}

const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of String(text).split(/\r?\n/)) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else { if (line) out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  return out;
}

export async function buildInvoice(d: InvoiceData): Promise<{ base64: string; fontsEmbedded: boolean }> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  let R: PDFFont, S: PDFFont, B: PDFFont, fontsEmbedded = true;
  try {
    const [r, s, b] = await Promise.all([bytes(FONT_URLS.regular), bytes(FONT_URLS.semibold), bytes(FONT_URLS.bold)]);
    R = await pdf.embedFont(r, { subset: true }); S = await pdf.embedFont(s, { subset: true }); B = await pdf.embedFont(b, { subset: true });
  } catch (_e) {
    fontsEmbedded = false;
    R = await pdf.embedFont(StandardFonts.Helvetica); S = await pdf.embedFont(StandardFonts.HelveticaBold); B = S;
  }
  pdf.setTitle(`Mint Timepieces invoice ${d.number}`);
  pdf.setAuthor("Mint Timepieces");
  const W = 612, H = 792, M = 48;
  const page: PDFPage = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: K.white });

  // header on pale mint
  const headH = 92;
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: headH, color: K.mint });
  page.drawRectangle({ x: 0, y: H - headH - 1, width: W, height: 1, color: K.brass });
  try {
    const lb = await bytes(LOGO);
    const img = isPng(lb) ? await pdf.embedPng(lb) : isJpg(lb) ? await pdf.embedJpg(lb) : null;
    if (img) page.drawImage(img, { x: M, y: H - headH + 26, width: 40, height: 40 });
  } catch (_e) { /* header still carries the wordmark */ }
  // letter spaced caps, drawn glyph by glyph (pdf-lib has no tracking option)
  const spacedWidth = (t: string, size: number, font: PDFFont, track: number) => [...t].reduce((w, ch) => w + font.widthOfTextAtSize(ch, size) + track, -track);
  const spaced = (t: string, x: number, yy: number, size: number, font: PDFFont, color: any, track: number) => { let cx = x; for (const ch of t) { page.drawText(ch, { x: cx, y: yy, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + track; } };
  spaced("MINT TIMEPIECES", M + 54, H - headH + 41, 11, B, K.deep, 3.4);
  const lab = "INVOICE";
  spaced(lab, W - M - spacedWidth(lab, 9, B, 1.6), H - headH + 52, 9, B, K.brassText, 1.6);
  page.drawText(d.number, { x: W - M - S.widthOfTextAtSize(d.number, 14), y: H - headH + 30, size: 14, font: S, color: K.deep });

  let y = H - headH - 40;
  const label = (t: string, x: number, yy: number) => spaced(t.toUpperCase(), x, yy, 7.5, B, K.brassText, 1.3);
  const textLines = (lines: string[], x: number, yy: number, size: number, font: PDFFont, color = K.deep, lead = 1.45) => { lines.forEach((l, i) => page.drawText(l, { x, y: yy - i * size * lead, size, font, color })); return yy - lines.length * size * lead; };

  // meta row
  const colW = (W - 2 * M) / 3;
  const meta: [string, string][] = [["Issued", d.issued], ["Held until", d.heldUntil], ["Payment", "Bank wire"]];
  meta.forEach(([k, v], i) => { label(k, M + i * colW, y); textLines(wrap(v, S, 10.5, colW - 12), M + i * colW, y - 15, 10.5, S); });
  y -= 56;

  // billed to and the piece
  label("Billed to", M, y);
  const bill = [d.legalName, ...d.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean), d.email, d.mobile || ""].filter(Boolean);
  const half = (W - 2 * M) / 2;
  const billEnd = textLines(bill.flatMap((l) => wrap(l, R, 10.5, half - 20)), M, y - 15, 10.5, R);

  // piece card
  const cardX = M + half, cardW = half, cardH = 96, cardY = y - cardH + 8;
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: K.mint, borderColor: K.mint, borderWidth: 0 } as any);
  let tx = cardX + 14;
  if (d.image) {
    try {
      const ib = await bytes(d.image);
      const im = isPng(ib) ? await pdf.embedPng(ib) : isJpg(ib) ? await pdf.embedJpg(ib) : null;
      if (im) {
        const box = cardH - 20, sc = Math.min(box / im.width, box / im.height);
        const iw = im.width * sc, ih = im.height * sc;
        page.drawImage(im, { x: cardX + 10 + (box - iw) / 2, y: cardY + 10 + (box - ih) / 2, width: iw, height: ih });
        tx = cardX + 10 + box + 12;
      }
    } catch (_e) { /* photo optional */ }
  }
  const tl = wrap(d.title, S, 11.5, cardX + cardW - tx - 10).slice(0, 3);
  let ty = textLines(tl, tx, cardY + cardH - 26, 11.5, S);
  if (d.reference) page.drawText(`Ref. ${d.reference}`, { x: tx, y: ty - 4, size: 9.5, font: R, color: K.soft });
  y = Math.min(billEnd, cardY) - 30;

  // totals
  label("Totals", M, y); y -= 10;
  const rows: [string, string][] = [["Listed price", money(d.listed)], ["Delivery", d.deliveryLabel], [d.taxed ? `California sales tax ${String(Math.round((d.listed > 0 ? (d.tax / d.listed) * 100 : 10.25) * 1000) / 1000)}%` : "Sales tax", d.taxed ? money(d.tax) : "Not collected"]];
  if (d.deposit && d.deposit > 0) rows.push(["Deposit paid, credited to your total", money(d.deposit)]);
  for (const [k, v] of rows) {
    y -= 20;
    page.drawText(k, { x: M, y, size: 10.5, font: R, color: K.soft });
    page.drawText(v, { x: W - M - R.widthOfTextAtSize(v, 10.5), y, size: 10.5, font: R, color: K.deep });
    page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 0.6, color: K.line });
  }
  y -= 40;
  page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 38, color: K.deep });
  page.drawText("Bank wire total", { x: M + 16, y: y + 6, size: 12, font: S, color: K.cream });
  const due = money(d.deposit && d.deposit > 0 ? d.total - d.deposit : d.total);
  page.drawText(due, { x: W - M - 16 - B.widthOfTextAtSize(due, 15), y: y + 5, size: 15, font: B, color: K.cream });
  y -= 30;
  if (d.useTax) { y = textLines(wrap(d.useTax, R, 8.5, W - 2 * M), M, y, 8.5, R, K.muted) - 4; }

  // wire instructions
  y -= 18;
  label("Wire instructions", M, y);
  const wl = wrap(d.wireInstructions, R, 10, W - 2 * M - 32);
  const boxH = wl.length * 14.5 + 28;
  page.drawRectangle({ x: M, y: y - 10 - boxH, width: W - 2 * M, height: boxH, color: K.white, borderColor: K.brass, borderWidth: 0.8 });
  textLines(wl, M + 16, y - 10 - 20, 10, R, K.deep);
  y = y - 10 - boxH - 22;
  y = textLines(wrap("Wire instructions never change. If you receive different instructions, call us before sending anything.", S, 9.5, W - 2 * M), M, y, 9.5, S, K.deep) - 4;
  y = textLines(wrap(`Your piece is held for you until ${d.heldUntil}. Please complete your wire by then and include ${d.number} as the reference.`, R, 9.5, W - 2 * M), M, y, 9.5, R, K.soft);

  // footer
  page.drawRectangle({ x: M, y: 52, width: W - 2 * M, height: 0.6, color: K.brass });
  const f1 = "Mint Timepieces, Los Angeles, CA";
  const f2 = "sales@mintimepieces.com   (424) 248-7674";
  page.drawText(f1, { x: M, y: 36, size: 8.5, font: S, color: K.deep });
  page.drawText(f2, { x: W - M - R.widthOfTextAtSize(f2, 8.5), y: 36, size: 8.5, font: R, color: K.muted });

  const out = await pdf.save();
  let bin = ""; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return { base64: btoa(bin), fontsEmbedded };
}
