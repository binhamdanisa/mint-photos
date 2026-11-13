// Mint Timepieces email design, shared by every function that sends from sales@mintimepieces.com.
// Nov 13 2026 redesign to match the site: cream ground, deep green header with the M and the letter spaced name in
// pale mint, a gold hairline, a white card with generous air, Bricolage Grotesque, deep green pill buttons, and totals
// set in a deep green panel like the checkout order card. Table layout, inline styles, 600 px, phone first, legible
// in dark mode, plain text twin for every email.

export const SITE = "https://www.mintimepieces.com";
export const FROM = "Mint Timepieces <sales@mintimepieces.com>";
export const TEAM = "sales@mintimepieces.com";
export const LOGO = "https://framerusercontent.com/images/QaIeE49f1vPwbmqw0Cc9F1fjI.png"; // M mark on cream, opaque so it reads in dark mode
export const PERMIT = "Mint Investments LLC. California Seller's Permit No. 235860960-00001.";
export const C = {
  page: "#F8F5F0",      // cream ground
  green: "#1E3A2A",     // deep green: header, buttons, totals panel
  green2: "#264936",
  pale: "#DCE4D7",      // pale mint: text on green
  mint: "#EAF0E6",      // pale sage: photo stages and tiles
  tint: "#F3F6F1",
  deep: "#1D1D1F",      // ink: all body text
  soft: "#66676B",
  muted: "#8C8C90",
  brass: "#A56F18",     // gold hairline
  brassText: "#A56F18",
  card: "#FFFFFF",
  line: "#ECE6DC",
  cream: "#F8F5F0",
};
export const FONT = "'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (t: unknown) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const moneyRound = (n: number) => "$" + Math.round(Number(n || 0)).toLocaleString("en-US");

export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px;"><tr><td class="btn" bgcolor="${C.green}" style="background:${C.green};border-radius:999px;">
<a href="${esc(href)}" style="display:inline-block;padding:17px 34px;font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:0.01em;color:${C.pale};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}
export function ghostButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px;"><tr><td class="ghost" style="border:1.5px solid ${C.green};border-radius:999px;">
<a href="${esc(href)}" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.green};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}
export const eyebrow = (t: string) => `<p style="margin:0 0 12px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.brassText};">${esc(t)}</p>`;
export const h1 = (t: string) => `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:30px;line-height:1.12;font-weight:600;letter-spacing:-0.03em;color:${C.deep};">${esc(t)}</h1>`;
export const p = (html: string, extra = "") => `<p style="margin:0 0 18px;font-family:${FONT};font-size:16px;line-height:1.65;color:${C.deep};${extra}">${html}</p>`;
export const small = (html: string) => `<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.soft};">${html}</p>`;
export const rule = () => `<div style="height:1px;line-height:1px;font-size:1px;background:${C.line};margin:24px 0;">&nbsp;</div>`;

/** Totals in a deep green panel, like the order card on the site. rows: [label, value, strong?]; a strong row is the total. */
export function totals(rows: [string, string, boolean?][]) {
  const tr = rows.map(([l, v, s], i) => {
    if (s) {
      const top = i > 0 ? "border-top:1px solid rgba(220,228,215,0.18);" : "";
      return `<tr><td class="tl" style="padding:16px 0 2px;${top}font-family:${FONT};font-size:14px;font-weight:500;color:${C.pale};">${l}</td><td class="tv" align="right" style="padding:16px 0 2px;${top}font-family:${FONT};font-size:26px;line-height:1;font-weight:600;letter-spacing:-0.02em;color:#F7FAF5;white-space:nowrap;">${v}</td></tr>`;
    }
    return `<tr><td class="tl" style="padding:6px 0;font-family:${FONT};font-size:14.5px;color:rgba(220,228,215,0.8);">${l}</td><td class="tl" align="right" style="padding:6px 0;font-family:${FONT};font-size:14.5px;color:rgba(220,228,215,0.86);white-space:nowrap;">${v}</td></tr>`;
  }).join("");
  return `<table role="presentation" class="totals" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.green}" style="margin:6px 0 24px;background:${C.green};border-radius:22px;"><tr><td style="padding:16px 22px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${tr}</table></td></tr></table>`;
}

/** The piece, staged on pale sage like the site, with its name and reference. */
export function piece(title: string, reference: string | null | undefined, image?: string | null, sub?: string) {
  const img = image ? `<td width="104" valign="middle" style="padding-right:18px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="stage" width="104" height="104" align="center" valign="middle" bgcolor="${C.mint}" style="width:104px;height:104px;background:${C.mint};border-radius:18px;"><img src="${esc(String(image).replace("bg=DEE6DA", "bg=EAF0E6"))}" width="88" height="88" alt="${esc(title)}" style="display:block;width:88px;height:88px;object-fit:contain;border:0;"></td></tr></table></td>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tile" style="margin:0 0 22px;background:${C.tint};border:1px solid #E1E8DC;border-radius:22px;"><tr><td class="tile" style="padding:14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${img}<td valign="middle" style="font-family:${FONT};color:${C.deep};padding:${image ? "0" : "4px 6px"};">
<div style="font-size:17px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;">${esc(title)}</div>${reference ? `<div class="sub" style="font-size:13px;color:${C.soft};margin-top:5px;">Ref. ${esc(reference)}</div>` : ""}${sub ? `<div class="sub" style="font-size:13px;color:${C.soft};margin-top:5px;">${sub}</div>` : ""}
</td></tr></table></td></tr></table>`;
}

/** Converts the designed HTML body to a readable plain text twin. */
export function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return l && !href.startsWith("mailto:") && !href.startsWith("sms:") && l !== href ? `${l}: ${href}` : l || href;
    })
    .replace(/<\/(p|h1|h2|div|tr|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td>\s*<td[^>]*>/gi, "   ")
    .replace(/<[^>]+>/g, "")
    .replace(/&rarr;/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface ShellOpts { title: string; preheader?: string; body: string; unsubscribe?: string; footerNote?: string; banner?: string }

/** The full designed email: deep green header with the M and the name in pale mint, gold hairline, white card on cream, Los Angeles footer. */
export function shell(o: ShellOpts) {
  const pre = o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.preheader)}${"&#8199;&#65279;&#847; ".repeat(30)}</div>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.title)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');
@media (max-width:620px){ .wrap{width:100%!important} .pad{padding:32px 22px 30px!important} .hpad{padding:18px 20px!important} .card h1{font-size:26px!important} }
@media (prefers-color-scheme:dark){
  .bg{background:#121512!important} .card{background:#1A1F1B!important;border-color:#2A322B!important}
  .ink,.card p,.card h1,.card td,.card div,.card li{color:#ECEFE9!important} .foot,.foot a,.foot div{color:#9AA197!important}
  .card a{color:#ECEFE9!important}
  .btn{background:#DCE4D7!important} .btn a{color:#1E3A2A!important} .ghost{border-color:#DCE4D7!important} .ghost a{color:#DCE4D7!important}
  .tile{background:#222923!important;border-color:#2F3830!important} .tile div,.tile a{color:#ECEFE9!important} .tile .sub{color:#A3AAA0!important} .stage{background:#DCE4D7!important}
  .card .totals td.tl{color:#DCE4D7!important} .card .totals td.tv{color:#F7FAF5!important}
  .card .num{background:#222923!important;border:1px solid #2F3830!important} .card .num .num-lbl{color:#C9A362!important} .card .num .num-val{color:#F7FAF5!important}
}
</style></head>
<body class="bg" style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">${pre}${o.banner || ""}
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px 20px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="head hpad" bgcolor="${C.green}" style="background:${C.green};border-radius:28px 28px 0 0;padding:22px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" width="50" style="padding-right:12px;"><a href="${SITE}"><img src="${LOGO}" width="38" height="38" alt="Mint Timepieces" style="display:block;width:38px;height:38px;border-radius:11px;border:0;"></a></td>
<td valign="middle"><a href="${SITE}" style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.34em;color:${C.pale};text-decoration:none;white-space:nowrap;">MINT TIMEPIECES</a></td>
</tr></table></td></tr>
<tr><td bgcolor="${C.brass}" style="height:1px;line-height:1px;font-size:1px;background:${C.brass};">&nbsp;</td></tr>
<tr><td class="card pad" bgcolor="${C.card}" style="background:${C.card};border:1px solid #E6E0D6;border-top:0;border-radius:0 0 28px 28px;padding:42px 40px 40px;font-family:${FONT};font-size:16px;line-height:1.65;color:${C.deep};"><!--mint-body-->${o.body}<!--/mint-body--></td></tr>
<tr><td class="foot" style="padding:28px 10px 8px;font-family:${FONT};font-size:12.5px;line-height:1.7;color:${C.muted};">
<div style="font-size:11px;font-weight:600;letter-spacing:0.3em;color:${C.green};padding-bottom:10px;">MINT TIMEPIECES</div>
${o.footerNote ? `${o.footerNote}<br>` : ""}Questions? Reply to this email or text us at <a href="sms:+14242487674" style="color:${C.muted};white-space:nowrap;">(424) 248-7674</a>.<br>
Mint Timepieces, Los Angeles, CA<br>${PERMIT}${o.unsubscribe ? `<br><a href="${esc(o.unsubscribe)}" style="color:${C.muted};">Unsubscribe</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = `MINT TIMEPIECES\n\n${toText(o.body)}\n\n${o.footerNote ? toText(o.footerNote) + "\n" : ""}Questions? Reply to this email or text us at (424) 248-7674.\nMint Timepieces, Los Angeles, CA\n${PERMIT}${o.unsubscribe ? `\nUnsubscribe: ${o.unsubscribe}` : ""}`;
  return { html, text };
}

export interface Attachment { filename: string; content: string } // base64

export async function sendResend(key: string, to: string | string[], subject: string, mail: { html: string; text: string }, opts: { attachments?: Attachment[]; unsubscribe?: string; replyTo?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.unsubscribe) headers["List-Unsubscribe"] = `<${opts.unsubscribe}>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], reply_to: opts.replyTo || TEAM, subject, html: mail.html, text: mail.text, headers, attachments: opts.attachments }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 240)}`);
  return await r.json();
}

/**
 * Brings inline colors written by each function onto the current palette, so every email matches without editing
 * each message: dark pills and dark fills become deep green with pale mint text, older grey green text becomes ink,
 * the older mint tiles become pale sage, older lines and greys become the warm line and soft grey, and headings and
 * eyebrows written inline pick up the site type scale.
 */
export function normalize(html: string) {
  return String(html || "")
    .replace(/background:#1D1D1F;color:#FFFFFF/gi, `background:${C.green};color:${C.pale}`)
    .replace(/background:#313630;color:#F4F5F2/gi, `background:${C.green};color:${C.pale}`)
    .replace(/(background(?:-color)?:\s*)#313630/gi, `$1${C.green}`).replace(/bgcolor="#313630"/gi, `bgcolor="${C.green}"`)
    .replace(/#313630/gi, C.deep).replace(/rgba\(49,\s*54,\s*48/gi, "rgba(29,29,31")
    .replace(/#DEE6DA/gi, C.mint).replace(/#E4E8E1/gi, C.line).replace(/#5A6158/gi, C.soft).replace(/#6e6e73/gi, C.soft)
    .replace(/#7A8278/gi, C.muted).replace(/#F4F5F2/gi, C.cream).replace(/#C9A362/gi, C.brass)
    .replace(/<h1 style="margin:0 0 14px;font-size:26px;line-height:1\.2;font-weight:600;letter-spacing:-0\.02em;/g, `<h1 style="margin:0 0 16px;font-size:30px;line-height:1.12;font-weight:600;letter-spacing:-0.03em;`)
    .replace(/font-weight:700;letter-spacing:0\.18em;text-transform:uppercase;/g, "font-weight:600;letter-spacing:0.2em;text-transform:uppercase;");
}
/** One call for any function: designed HTML plus its plain text twin. */
export function brandEmail(o: ShellOpts) { return shell({ ...o, body: normalize(o.body) }); }
/** Plain text twin for a designed email built with shell(). */
export function textFromEmail(html: string) {
  const m = String(html).match(/<!--mint-body-->([\s\S]*?)<!--\/mint-body-->/);
  return `MINT TIMEPIECES\n\n${toText(m ? m[1] : html)}\n\nQuestions? Reply to this email or text us at (424) 248-7674.\nMint Timepieces, Los Angeles, CA\n${PERMIT}`;
}
