// Mint Timepieces email design, shared by every function that sends from sales@mintimepieces.com.
// Matched to the live site (Nov 13 2026): Syne for headings, labels and buttons (600, capitals, wide tracking),
// Libre Caslon Text for body copy, the site palette (page #F5F5F7, dark panels and buttons #313630, photo green
// #DEE6DA, gold #A56F18 labels and #C9A362 highlights), pill buttons in spaced capitals, white cards with soft corners.
// Table layout, inline styles, 600 px, phone first, legible in dark mode, plain text twin for every email.

export const SITE = "https://www.mintimepieces.com";
export const FROM = "Mint Timepieces <sales@mintimepieces.com>";
export const TEAM = "sales@mintimepieces.com";
export const LOGO = "https://framerusercontent.com/images/QaIeE49f1vPwbmqw0Cc9F1fjI.png"; // M mark on cream, opaque so it reads in dark mode
export const PERMIT = "Mint Investments LLC. California Seller's Permit No. 235860960-00001.";
export const C = {
  page: "#F5F5F7",      // site page ground
  dark: "#313630",      // site dark panels and buttons
  green: "#313630",     // alias kept for older callers: dark panels and buttons
  pale: "#F5F5F7",      // text on dark
  mint: "#DEE6DA",      // photo green behind every piece
  tint: "#F5F5F7",
  ink: "#1D1D1F",       // headings
  deep: "#313630",      // body text
  soft: "#5A6158",
  muted: "#7A8278",
  gold: "#C9A362",      // highlight gold, as in BECOME A SELLER.
  brass: "#C9A362",
  brassText: "#A56F18", // label gold
  card: "#FFFFFF",
  line: "#E4E8E1",
  cream: "#F5F5F7",
};
export const HEAD = "'Syne','Helvetica Neue',Helvetica,Arial,sans-serif";
export const SERIF = "'Libre Caslon Text',Georgia,'Times New Roman',serif";
export const FONT = SERIF; // body copy; headings, labels and buttons use HEAD
const CAPS = (size: number, track = 0.16) => `font-family:${HEAD};font-size:${size}px;font-weight:600;letter-spacing:${track}em;text-transform:uppercase;`;

export const esc = (t: unknown) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const moneyRound = (n: number) => "$" + Math.round(Number(n || 0)).toLocaleString("en-US");

/** The site's pill button: dark ground, light spaced capitals. */
export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px;"><tr><td class="btn" bgcolor="${C.dark}" style="background:${C.dark};border-radius:999px;">
<a href="${esc(href)}" style="display:inline-block;padding:16px 28px;${CAPS(12, 0.14)}color:${C.pale};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}
/** The site's outlined pill. */
export function ghostButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px;"><tr><td class="ghost" style="border:1px solid ${C.dark};border-radius:999px;">
<a href="${esc(href)}" style="display:inline-block;padding:15px 27px;${CAPS(12, 0.14)}color:${C.dark};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}
export const eyebrow = (t: string) => `<p style="margin:0 0 12px;${CAPS(11, 0.18)}color:${C.brassText};">${esc(t)}</p>`;
export const h1 = (t: string) => `<h1 style="margin:0 0 18px;${CAPS(22, 0.14)}line-height:1.3;color:${C.ink};">${esc(t)}</h1>`;
export const p = (html: string, extra = "") => `<p style="margin:0 0 18px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${C.deep};${extra}">${html}</p>`;
export const small = (html: string) => `<p style="margin:0 0 12px;font-family:${SERIF};font-size:13.5px;line-height:1.6;color:${C.soft};">${html}</p>`;
export const rule = () => `<div style="height:1px;line-height:1px;font-size:1px;background:${C.line};margin:24px 0;">&nbsp;</div>`;

/** Totals in a dark panel like the site's dark sections. rows: [label, value, strong?]; a strong row is a total. */
export function totals(rows: [string, string, boolean?][]) {
  const tr = rows.map(([l, v, s], i) => {
    if (s) {
      const top = i > 0 ? "border-top:1px solid rgba(245,245,247,0.16);" : "";
      return `<tr><td class="tl" style="padding:16px 0 4px;${top}${CAPS(11, 0.18)}color:${C.gold};">${l}</td><td class="tv" align="right" style="padding:16px 0 4px;${top}font-family:${HEAD};font-size:22px;line-height:1;font-weight:600;letter-spacing:0.02em;color:${C.pale};white-space:nowrap;">${v}</td></tr>`;
    }
    return `<tr><td class="tl" style="padding:6px 0;font-family:${SERIF};font-size:15px;color:rgba(245,245,247,0.76);">${l}</td><td class="tl" align="right" style="padding:6px 0;font-family:${SERIF};font-size:15px;color:rgba(245,245,247,0.9);white-space:nowrap;">${v}</td></tr>`;
  }).join("");
  return `<table role="presentation" class="totals" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.dark}" style="margin:6px 0 24px;background:${C.dark};border-radius:20px;"><tr><td style="padding:18px 24px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${tr}</table></td></tr></table>`;
}

/** The piece as a site card: photo on photo green, serif name, reference in small capitals. */
export function piece(title: string, reference: string | null | undefined, image?: string | null, sub?: string) {
  const src = image ? String(image).replace("bg=EAF0E6", "bg=DEE6DA") : "";
  const img = image ? `<td width="104" valign="middle" style="padding-right:18px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="stage" width="104" height="104" align="center" valign="middle" bgcolor="${C.mint}" style="width:104px;height:104px;background:${C.mint};border-radius:14px;"><img src="${esc(src)}" width="92" height="92" alt="${esc(title)}" style="display:block;width:92px;height:92px;object-fit:contain;border:0;"></td></tr></table></td>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tile" style="margin:0 0 22px;background:${C.page};border-radius:20px;"><tr><td class="tile" style="padding:12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${img}<td valign="middle" style="color:${C.ink};padding:${image ? "0" : "6px 8px"};">
<div style="font-family:${SERIF};font-size:18px;font-weight:700;line-height:1.3;color:${C.ink};">${esc(title)}</div>${reference ? `<div class="sub" style="${CAPS(10.5, 0.16)}color:${C.muted};margin-top:7px;">Ref. ${esc(reference)}</div>` : ""}${sub ? `<div class="sub" style="font-family:${SERIF};font-size:13.5px;color:${C.soft};margin-top:5px;">${sub}</div>` : ""}
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

/**
 * Puts any body onto the site system, including the inline styles older functions write: every heading becomes Syne
 * capitals, every uppercase label takes Syne, dark pills and fills become the site dark #313630 with light text, and
 * older greys and lines map onto the site palette.
 */
export function restyle(html: string) {
  return String(html || "")
    .replace(/background:#1D1D1F;color:#FFFFFF/gi, `background:${C.dark};color:${C.pale}`)
    .replace(/background:#1E3A2A;color:#DCE4D7/gi, `background:${C.dark};color:${C.pale}`)
    .replace(/#1E3A2A/gi, C.dark).replace(/#DCE4D7/gi, C.pale).replace(/#EAF0E6/gi, C.mint).replace(/#ECE6DC/gi, C.line)
    .replace(/#6e6e73/gi, C.soft).replace(/rgba\(29,\s*29,\s*31,\s*0\.1\)/gi, C.line)
    // headings: Syne capitals, whatever the inline style said
    .replace(/<h1 style="([^"]*)"/g, (_m, s) => `<h1 style="${String(s).replace(/(font-family|font-size|font-weight|letter-spacing|line-height|text-transform):[^;"]*;?/g, "")}${CAPS(22, 0.14)}line-height:1.3;color:${C.ink};"`)
    // uppercase labels: Syne
    .replace(/style="([^"]*text-transform:uppercase[^"]*)"/g, (_m, s) => `style="font-family:${HEAD};${String(s).replace(/font-family:[^;"]*;?/g, "").replace(/font-weight:700/g, "font-weight:600")}"`);
}

export interface ShellOpts { title: string; preheader?: string; body: string; unsubscribe?: string; footerNote?: string; banner?: string }

/** The full designed email: dark header with the M and the spaced name, white card on the site's light grey, Los Angeles footer. */
export function shell(o: ShellOpts) {
  const pre = o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.preheader)}${"&#8199;&#65279;&#847; ".repeat(30)}</div>` : "";
  const body = restyle(o.body);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.title)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap');
@media (max-width:620px){ .wrap{width:100%!important} .pad{padding:30px 22px 28px!important} .hpad{padding:18px 20px!important} .card h1{font-size:19px!important} }
@media (prefers-color-scheme:dark){
  .bg{background:#161816!important} .card{background:#1F221F!important}
  .card p,.card td,.card div,.card li{color:#E9ECE6!important} .card h1{color:#F5F5F7!important} .foot,.foot a,.foot div{color:#9AA197!important}
  .card a{color:#F5F5F7!important}
  .btn{background:#F5F5F7!important} .btn a{color:#313630!important} .ghost{border-color:#F5F5F7!important} .ghost a{color:#F5F5F7!important}
  .tile{background:#2A2E2A!important} .tile div,.tile a{color:#E9ECE6!important} .tile .sub{color:#A3AAA0!important} .stage{background:#DEE6DA!important}
  .card .totals td.tl{color:#C9A362!important} .card .totals td.tv{color:#F5F5F7!important}
  .card .num{background:#2A2E2A!important;border:1px solid #3A3F39!important} .card .num .num-lbl{color:#C9A362!important} .card .num .num-val{color:#F5F5F7!important}
}
</style></head>
<body class="bg" style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">${pre}${o.banner || ""}
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px 20px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="head hpad" bgcolor="${C.dark}" style="background:${C.dark};border-radius:20px 20px 0 0;padding:22px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" width="50" style="padding-right:12px;"><a href="${SITE}"><img src="${LOGO}" width="38" height="38" alt="Mint Timepieces" style="display:block;width:38px;height:38px;border-radius:9px;border:0;"></a></td>
<td valign="middle"><a href="${SITE}" style="${CAPS(13, 0.3)}color:${C.pale};text-decoration:none;white-space:nowrap;">MINT TIMEPIECES</a></td>
</tr></table></td></tr>
<tr><td class="card pad" bgcolor="${C.card}" style="background:${C.card};border-radius:0 0 20px 20px;padding:40px 38px 38px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${C.deep};"><!--mint-body-->${body}<!--/mint-body--></td></tr>
<tr><td class="foot" style="padding:28px 10px 8px;font-family:${SERIF};font-size:13px;line-height:1.7;color:${C.muted};">
<div style="${CAPS(11, 0.3)}color:${C.dark};padding-bottom:10px;">MINT TIMEPIECES</div>
${o.footerNote ? `${o.footerNote}<br>` : ""}Questions? Reply to this email or text us at <a href="sms:+14242487674" style="color:${C.muted};white-space:nowrap;">(424) 248-7674</a>.<br>
Mint Timepieces, Los Angeles, CA<br><span style="${CAPS(9.5, 0.14)}">${PERMIT}</span>${o.unsubscribe ? `<br><a href="${esc(o.unsubscribe)}" style="color:${C.muted};">Unsubscribe</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = `MINT TIMEPIECES\n\n${toText(body)}\n\n${o.footerNote ? toText(o.footerNote) + "\n" : ""}Questions? Reply to this email or text us at (424) 248-7674.\nMint Timepieces, Los Angeles, CA\n${PERMIT}${o.unsubscribe ? `\nUnsubscribe: ${o.unsubscribe}` : ""}`;
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

/** Kept for callers that still import it; shell() now applies the site system to every body. */
export function normalize(html: string) { return restyle(html); }
/** One call for any function: designed HTML plus its plain text twin. */
export function brandEmail(o: ShellOpts) { return shell(o); }
/** Plain text twin for a designed email built with shell(). */
export function textFromEmail(html: string) {
  const m = String(html).match(/<!--mint-body-->([\s\S]*?)<!--\/mint-body-->/);
  return `MINT TIMEPIECES\n\n${toText(m ? m[1] : html)}\n\nQuestions? Reply to this email or text us at (424) 248-7674.\nMint Timepieces, Los Angeles, CA\n${PERMIT}`;
}
