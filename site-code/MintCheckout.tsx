import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Script 54: the Mint Timepieces checkout, on mintimepieces.com, with Stripe processing the card behind the embedded
// Payment Element. Every amount shown here is a preview; the checkout function computes the real total on the server
// from the catalog record and only returns a PaymentIntent client secret. The page never holds a secret key; the
// publishable key arrives from the server for the mode it runs in.
//   /checkout?items=slug[,slug]&delivery=ca   an accessory, handbag or a whole bag (instant purchase)
//   /checkout?t=TOKEN                         an approved watch or bag from the availability flow email
// ThankYou (below) is the /thank-you page: it asks the server for the payment, which records the order only once
// Stripe confirms it.

const ENDPOINT = "https://rkvqnxbjosusivbdjjhx.supabase.co/functions/v1/checkout"
const LOGO = "https://framerusercontent.com/images/QaIeE49f1vPwbmqw0Cc9F1fjI.png"
const SITE = "https://www.mintimepieces.com"
const GREEN = "#1E3A2A"
const GREEN_2 = "#264936"
const PALE = "#DCE4D7"
const SAGE = "#D4DCCF"
const CREAM = "#F8F5F0"
const INK = "#1D1D1F"
const GOLD = "#A56F18"
const GOLD_TEXT = "#7E5310"
const SOFT = "rgba(29,29,31,0.62)"
const FONT = "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap"
const CONSENT = "Yes, Mint Timepieces may text and email me about this piece and similar pieces. Message and data rates may apply. Reply STOP to a text to opt out at any time."
const WIRE_LINE = "Wire instructions arrive by email from sales@mintimepieces.com with your invoice the moment you reserve, and they never change. If you ever receive different instructions, call us before sending anything."
const CRYPTO_LINE = "Payment details are sent by email the moment you commit to the piece, at this exact US dollar total. No wallet address is ever shown on this site. If you ever receive different details, call us before sending anything."
const TEXT_NUMBER = "(424) 248-7674"
const SMS = "sms:+14242487674"
const BAG_KEY = "mint-bag-v1"
const LA_RATE = 10.25

type Delivery = "" | "pickup" | "ca" | "out"
type Method = "" | "wire" | "card" | "crypto"
type Piece = { slug: string; title: string; brand?: string; reference?: string; price: number; image?: string | null }
type Loaded = {
    ok: boolean; state: string; kind?: "instant" | "reservation"; pieces?: Piece[]; delivery?: Delivery | null; holdUntilLabel?: string
    prefill?: { name: string; email: string; phone: string; address: string }; cardReady?: boolean; publishableKey?: string | null
    useTax?: string; title?: string; slug?: string; reserveUrl?: string
}

const DELIVERIES: { id: Delivery; label: string; sub: string }[] = [
    { id: "pickup", label: "Pickup in Los Angeles", sub: "By appointment, sales tax applies" },
    { id: "ca", label: "Delivery in California", sub: "California sales tax applies" },
    { id: "out", label: "Delivery outside California", sub: "No California sales tax" },
]
const COUNTRIES: [string, string][] = [["US", "United States"], ["CA", "Canada"], ["MX", "Mexico"], ["GB", "United Kingdom"], ["IE", "Ireland"], ["FR", "France"], ["DE", "Germany"], ["IT", "Italy"], ["ES", "Spain"], ["PT", "Portugal"], ["NL", "Netherlands"], ["BE", "Belgium"], ["CH", "Switzerland"], ["AT", "Austria"], ["MC", "Monaco"], ["SE", "Sweden"], ["DK", "Denmark"], ["NO", "Norway"], ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"], ["QA", "Qatar"], ["KW", "Kuwait"], ["BH", "Bahrain"], ["OM", "Oman"], ["IL", "Israel"], ["HK", "Hong Kong"], ["SG", "Singapore"], ["JP", "Japan"], ["KR", "South Korea"], ["TW", "Taiwan"], ["AU", "Australia"], ["NZ", "New Zealand"]]

const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cents = (n: number) => Math.round(n * 100) / 100
// Preview only, the same rule the server applies: tax per piece at the Los Angeles rate on pickup and California
// delivery, none outside California; card adds 2.9% of the wire total as its own line.
function preview(pieces: Piece[], d: Delivery, m: Method) {
    const taxed = d === "pickup" || d === "ca"
    const price = cents(pieces.reduce((a, p) => a + (Number(p.price) || 0), 0))
    const tax = taxed ? cents(pieces.reduce((a, p) => a + Math.round((Number(p.price) || 0) * LA_RATE) / 100, 0)) : 0
    const wire = cents(price + tax)
    const fee = Math.round(wire * 2.9) / 100
    return { price, tax, taxed, wire, fee, card: cents(wire + fee), total: m === "card" ? cents(wire + fee) : wire }
}
const isCaState = (s: string) => /^(CA|CALIFORNIA)$/i.test(String(s || "").trim())

// Plain words for anything Stripe says, never the raw string.
function cardMessage(err: any): string {
    const code = String((err && (err.decline_code || err.code)) || "")
    if (err && err.type === "validation_error") return "Please check the card details above."
    if (/insufficient_funds/.test(code)) return "Your card was declined for insufficient funds. Nothing was charged. Please try another card, or choose bank wire."
    if (/expired_card/.test(code)) return "This card has expired. Nothing was charged. Please try another card."
    if (/incorrect_cvc|invalid_cvc/.test(code)) return "The security code does not match this card. Nothing was charged. Please check it and try again."
    if (/incorrect_number|invalid_number/.test(code)) return "The card number does not look right. Nothing was charged. Please check it and try again."
    if (/authentication/.test(code)) return "Your bank could not confirm this payment. Nothing was charged. Please try again, or use another card."
    if (/processing_error|rate_limit/.test(code)) return "The payment could not be completed just now. Nothing was charged. Please try again in a moment."
    if (err && err.type === "card_error") return "Your card was declined. Nothing was charged. Please try another card, or choose bank wire."
    return "The payment could not be completed. Nothing was charged. Please try again, or text us at " + TEXT_NUMBER + "."
}

function useFonts() {
    useEffect(() => {
        if (typeof document === "undefined" || document.getElementById("mint-bricolage")) return
        const l = document.createElement("link"); l.id = "mint-bricolage"; l.rel = "stylesheet"; l.href = FONT_CSS; document.head.appendChild(l)
        const st = document.createElement("style"); st.id = "mint-checkout-css"
        st.textContent = `@keyframes mintFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes mintShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes mintSpin{to{transform:rotate(360deg)}}
.mint-co input:focus,.mint-co select:focus{outline:none;border-color:${GREEN}!important;box-shadow:0 0 0 4px rgba(30,58,42,0.10)}
.mint-co button:focus-visible,.mint-co [role=radio]:focus-visible{outline:2px solid ${GOLD};outline-offset:3px}
.mint-co *{box-sizing:border-box}`
        document.head.appendChild(st)
    }, [])
}
function useIsPhone() {
    const [phone, setPhone] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        const m = window.matchMedia("(max-width: 899.98px)")
        const f = () => setPhone(m.matches)
        f(); m.addEventListener("change", f)
        return () => m.removeEventListener("change", f)
    }, [])
    return phone
}
let stripeJs: Promise<any> | null = null
function loadStripe(pk: string): Promise<any> {
    if (typeof window === "undefined") return Promise.reject(new Error("browser"))
    if (!stripeJs) stripeJs = new Promise((resolve, reject) => {
        const done = () => { const S = (window as any).Stripe; S ? resolve(S) : reject(new Error("Stripe unavailable")) }
        if ((window as any).Stripe) return done()
        const s = document.createElement("script"); s.src = "https://js.stripe.com/v3/"; s.async = true; s.onload = done; s.onerror = () => { stripeJs = null; reject(new Error("Stripe failed to load")) }
        document.head.appendChild(s)
    })
    return stripeJs.then((S) => S(pk))
}
async function api(body: any) {
    const r = await fetch(ENDPOINT, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    return r.json().catch(() => ({ ok: false }))
}

// ---------- shared chrome ----------
function Header() {
    const phone = useIsPhone()
    return (
        <div style={{ background: GREEN, color: PALE }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: phone ? "14px 18px" : "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <a href={SITE} style={{ display: "flex", alignItems: "center", gap: 12, color: PALE, textDecoration: "none" }}>
                    <img src={LOGO} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 10, display: "block" }} />
                    <span style={{ fontSize: phone ? 11.5 : 12.5, fontWeight: 600, letterSpacing: phone ? "0.24em" : "0.32em", whiteSpace: "nowrap" }}>MINT TIMEPIECES</span>
                </a>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(220,228,215,0.78)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" /></svg>
                    {phone ? null : "Secure checkout"}
                </span>
            </div>
            <div style={{ height: 1, background: GOLD }} />
        </div>
    )
}
const panel: CSSProperties = { background: "#fff", border: "1px solid " + SAGE, borderRadius: 24, boxShadow: "0 1px 2px rgba(29,29,31,0.03), 0 18px 40px -28px rgba(30,58,42,0.28)" }
const eyebrow: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD }
function Section({ n, title, children, note }: { n: number; title: string; children: ReactNode; note?: ReactNode }) {
    return (
        <section style={{ ...panel, padding: "22px 22px 24px", animation: "mintFade 420ms cubic-bezier(.22,1,.36,1) both", animationDelay: n * 60 + "ms" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, background: PALE, color: GREEN, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>{title}</h2>
            </div>
            {children}
            {note ? <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5, color: GOLD_TEXT }}>{note}</div> : null}
        </section>
    )
}
const inputStyle: CSSProperties = { width: "100%", padding: "14px 14px", borderRadius: 14, border: "1px solid " + SAGE, background: "#fff", fontFamily: FONT, fontSize: 16, color: INK, transition: "border-color 160ms ease, box-shadow 160ms ease" }
function Field({ label, children, error, optional }: { label: string; children: ReactNode; error?: string; optional?: boolean }) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: SOFT }}>{label}{optional ? <span style={{ fontWeight: 400 }}> · optional</span> : null}</span>
            {children}
            {error ? <span style={{ fontSize: 12.5, lineHeight: 1.45, color: GOLD_TEXT }}>{error}</span> : null}
        </label>
    )
}
function Shell({ children, phone }: { children: ReactNode; phone: boolean }) {
    return <div className="mint-co" style={{ width: "100%", minHeight: "100vh", background: CREAM, fontFamily: FONT, color: INK, WebkitFontSmoothing: "antialiased" } as CSSProperties}><Header />{children}<Footer phone={phone} /></div>
}
function Footer({ phone }: { phone: boolean }) {
    return <div style={{ maxWidth: 1180, margin: "0 auto", padding: phone ? "28px 20px 44px" : "40px 24px 56px", fontSize: 12.5, lineHeight: 1.7, color: "rgba(29,29,31,0.5)", display: "flex", flexWrap: "wrap", gap: "4px 18px", justifyContent: "space-between" }}>
        <span>Mint Timepieces, Los Angeles, CA</span>
        <span>Mint Investments LLC. California Seller's Permit No. 235860960-00001.</span>
    </div>
}
function Message({ phone, eyebrowText, title, children, actions }: { phone: boolean; eyebrowText: string; title: string; children: ReactNode; actions?: ReactNode }) {
    return (
        <Shell phone={phone}>
            <div style={{ maxWidth: 620, margin: "0 auto", padding: phone ? "36px 18px 0" : "72px 24px 0" }}>
                <div style={{ ...panel, padding: phone ? "30px 22px" : "44px 44px", animation: "mintFade 480ms cubic-bezier(.22,1,.36,1) both" }}>
                    <div style={eyebrow}>{eyebrowText}</div>
                    <h1 style={{ margin: "10px 0 14px", fontSize: phone ? 28 : 34, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</h1>
                    <div style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(29,29,31,0.75)" }}>{children}</div>
                    {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>{actions}</div> : null}
                </div>
            </div>
        </Shell>
    )
}
const primaryBtn = (disabled = false): CSSProperties => ({ minHeight: 56, padding: "0 26px", borderRadius: 999, border: 0, background: GREEN, color: PALE, fontFamily: FONT, fontSize: 16, fontWeight: 600, letterSpacing: "0.005em", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none", transition: "opacity 200ms ease, transform 200ms ease, box-shadow 200ms ease", boxShadow: disabled ? "none" : "0 14px 30px -16px rgba(30,58,42,0.7)", fontVariantNumeric: "tabular-nums" })
const quietLink: CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 56, padding: "0 6px", color: INK, fontWeight: 500, fontSize: 15, textDecoration: "underline", textUnderlineOffset: 4, textDecorationColor: "rgba(29,29,31,0.25)" }
const Spinner = () => <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 99, border: "2px solid rgba(220,228,215,0.35)", borderTopColor: PALE, animation: "mintSpin 800ms linear infinite", display: "inline-block" }} />

function NoLongerAvailable({ phone, title }: { phone: boolean; title?: string }) {
    return (
        <Message phone={phone} eyebrowText="No longer available" title={title ? `The ${title} is no longer available` : "This piece is no longer available"}
            actions={<><a href="/buy" style={primaryBtn()}>Source a piece for me</a><a href="/shop" style={quietLink}>Explore the collection</a></>}>
            This checkout has closed, either because the hold on the piece ended or because it has found a new owner. Nothing has been charged. Tell us the reference you have in mind and our specialists will find it for you, usually within days.
        </Message>
    )
}

// ---------- summary ----------
function Summary({ pieces, delivery, method, holdUntilLabel, useTax, compact = false }: { pieces: Piece[]; delivery: Delivery; method: Method; holdUntilLabel?: string; useTax?: string; compact?: boolean }) {
    const t = preview(pieces, delivery, method)
    const row: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, fontSize: 14.5, lineHeight: 1.4, color: "rgba(220,228,215,0.82)", fontVariantNumeric: "tabular-nums" }
    return (
        <div style={{ background: GREEN, color: PALE, borderRadius: compact ? 0 : 28, padding: compact ? "6px 20px 22px" : 26, boxShadow: compact ? "none" : "0 30px 60px -36px rgba(30,58,42,0.9)", position: "relative", overflow: "hidden" }}>
            {compact ? null : <div style={{ ...eyebrow, color: "#C9A362", marginBottom: 18 }}>Your order</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pieces.map((p) => (
                    <div key={p.slug} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <div style={{ width: compact ? 72 : 92, height: compact ? 72 : 92, borderRadius: 18, background: PALE, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {p.image ? <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: "#F3F6F1" }}>{p.title}</div>
                            <div style={{ fontSize: 13, marginTop: 4, color: "rgba(220,228,215,0.7)" }}>{[p.brand, p.reference ? "Ref. " + p.reference : ""].filter(Boolean).join(" · ") || "Mint Timepieces"}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ height: 1, background: "rgba(220,228,215,0.16)", margin: "20px 0 16px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={row}><span>{pieces.length > 1 ? "Listed prices" : "Listed price"}</span><span>{money(t.price)}</span></div>
                {method === "card" ? <div style={row}><span>Card payment 2.9%</span><span>{money(t.fee)}</span></div> : null}
                {delivery ? (t.taxed ? <div style={row}><span>California sales tax {LA_RATE}%</span><span>{money(t.tax)}</span></div> : <div style={row}><span>Sales tax</span><span>Not collected</span></div>) : <div style={{ ...row, color: "rgba(220,228,215,0.6)" }}><span>Sales tax</span><span>Set by delivery</span></div>}
            </div>
            <div style={{ height: 1, background: "rgba(220,228,215,0.16)", margin: "16px 0 14px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{method === "card" ? "Total by card" : method === "crypto" ? "Total in cryptocurrency" : method === "wire" ? "Total by bank wire" : "Total"}</span>
                <span key={t.total} style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "#F3F6F1", fontVariantNumeric: "tabular-nums", animation: "mintFade 260ms ease both" }}>{money(t.total)}</span>
            </div>
            {delivery === "out" && useTax ? <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: "rgba(220,228,215,0.7)" }}>{useTax}</div> : null}
            {holdUntilLabel ? <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", padding: "11px 14px", borderRadius: 14, background: "rgba(220,228,215,0.08)", border: "1px solid rgba(201,163,98,0.45)", fontSize: 13, lineHeight: 1.45 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: "#C9A362", flexShrink: 0 }} />Held for you until {holdUntilLabel}</div> : null}
        </div>
    )
}

// ---------- payment option panels ----------
function Option({ id, on, title, tag, sub, onPick, children }: { id: Method; on: boolean; title: string; tag?: string; sub: string; onPick: (m: Method) => void; children?: ReactNode }) {
    return (
        <div style={{ borderRadius: 18, border: on ? "1.5px solid " + GREEN : "1px solid " + SAGE, background: on ? "#FBFCFA" : "#fff", transition: "border-color 200ms ease, background 200ms ease, box-shadow 200ms ease", boxShadow: on ? "0 10px 26px -18px rgba(30,58,42,0.45)" : "none" }}>
            <div role="radio" aria-checked={on} tabIndex={0} onClick={() => onPick(id)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onPick(id) } }} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 16px", cursor: "pointer", borderRadius: 18 }}>
                <span aria-hidden="true" style={{ marginTop: 2, width: 20, height: 20, borderRadius: 99, border: on ? "6px solid " + GREEN : "1.5px solid rgba(29,29,31,0.3)", flexShrink: 0, transition: "border 180ms ease", background: "#fff" }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 15.5, fontWeight: 600 }}>{title}{tag ? <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(165,111,24,0.12)", color: GOLD, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{tag}</span> : null}</span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: SOFT }}>{sub}</span>
                </span>
            </div>
            {on && children ? <div style={{ padding: "0 16px 16px 50px", animation: "mintFade 260ms ease both" }}>{children}</div> : null}
        </div>
    )
}

const SAMPLE: Loaded = { ok: true, state: "open", kind: "instant", pieces: [{ slug: "sample", title: "Rolex Keyring 18K Gold Plated", brand: "Rolex", reference: "", price: 320, image: "https://framerusercontent.com/images/QaIeE49f1vPwbmqw0Cc9F1fjI.png" }], delivery: "ca", cardReady: true, useTax: "" }

/**
 * The full checkout page. Place it alone on the /checkout page at full width.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function MintCheckout(props: { style?: CSSProperties; preview?: string }) {
    useFonts()
    // "Design preview" shows sample content for review in Framer; leave it on Off for the live page.
    const canvas = RenderTarget.current() === RenderTarget.canvas || (!!props.preview && props.preview !== "off")
    const phone = useIsPhone()
    const [data, setData] = useState<Loaded | null>(canvas ? (props.preview === "unavailable" ? { ok: true, state: "unavailable", title: "Rolex Submariner Date 126610LN" } : SAMPLE) : null)
    const [delivery, setDelivery] = useState<Delivery>(canvas ? "ca" : "")
    const [method, setMethod] = useState<Method>(props.preview === "card" ? "card" : props.preview === "wire" ? "wire" : "")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phoneNo, setPhoneNo] = useState("")
    const [consent, setConsent] = useState(false)
    const [addr, setAddr] = useState({ line1: "", line2: "", city: "", state: "", postal_code: "", country: "US" })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [cardError, setCardError] = useState("")
    const [payError, setPayError] = useState("")
    const [busy, setBusy] = useState(false)
    const [status, setStatus] = useState("")
    const [cryptoDone, setCryptoDone] = useState<number | null>(null)
    const [openSummary, setOpenSummary] = useState(false)
    const [elementReady, setElementReady] = useState(false)
    const q = useRef<{ token: string; items: string }>({ token: "", items: "" })
    const ref = useRef("")
    const stripeRef = useRef<any>(null)
    const elementsRef = useRef<any>(null)
    const cardMount = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (canvas || typeof window === "undefined") return
        try { const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, nofollow"; document.head.appendChild(m) } catch (e) {}
        const p = new URLSearchParams(window.location.search)
        q.current = { token: p.get("t") || "", items: p.get("items") || p.get("piece") || "" }
        const d = p.get("delivery")
        // Photos the product page or bag handed over (display only; prices always come from the server).
        let imgs: Record<string, string> = {}
        try { imgs = JSON.parse(window.sessionStorage.getItem("mint-checkout-images") || "{}") || {} } catch (e) {}
        api(q.current.token ? { action: "load", token: q.current.token } : { action: "load", items: q.current.items.split(","), delivery: d })
            .then((j: Loaded) => {
                if (j && j.pieces) j.pieces = j.pieces.map((p) => ({ ...p, image: p.image || (/^https:\/\/(framerusercontent\.com|raw\.githubusercontent\.com|wsrv\.nl)\//.test(imgs[p.slug] || "") ? imgs[p.slug] : null) }))
                setData(j && j.ok ? j : { ok: false, state: "invalid" })
                if (j && j.delivery) setDelivery(j.delivery as Delivery)
                if (j && j.prefill) { setName(j.prefill.name || ""); setEmail(j.prefill.email || ""); setPhoneNo(j.prefill.phone || "") }
            })
            .catch(() => setData({ ok: false, state: "invalid" }))
    }, [])

    const pieces = (data && data.pieces) || []
    const t = preview(pieces, delivery, method)

    // Stripe Payment Element, deferred: the PaymentIntent is created on the server only when the client pays.
    useEffect(() => {
        if (canvas || method !== "card" || !data || !data.publishableKey || !cardMount.current) return
        let cancelled = false
        loadStripe(data.publishableKey).then((stripe) => {
            if (cancelled || !cardMount.current) return
            stripeRef.current = stripe
            if (!elementsRef.current) {
                elementsRef.current = stripe.elements({
                    mode: "payment", currency: "usd", amount: Math.round(t.card * 100), paymentMethodTypes: ["card"],
                    fonts: [{ cssSrc: FONT_CSS }],
                    appearance: {
                        theme: "flat",
                        variables: { fontFamily: FONT, fontSizeBase: "16px", colorPrimary: GREEN, colorText: INK, colorTextSecondary: "rgba(29,29,31,0.62)", colorBackground: "#ffffff", colorDanger: GOLD_TEXT, borderRadius: "14px", spacingUnit: "4px", focusBoxShadow: "0 0 0 4px rgba(30,58,42,0.10)", focusOutline: "none" },
                        rules: {
                            ".Input": { border: "1px solid " + SAGE, boxShadow: "none", padding: "14px" },
                            ".Input:focus": { border: "1px solid " + GREEN },
                            ".Label": { fontSize: "12.5px", fontWeight: "500", color: "rgba(29,29,31,0.62)" },
                            ".Tab": { border: "1px solid " + SAGE, boxShadow: "none" },
                            ".Tab--selected": { border: "1.5px solid " + GREEN, boxShadow: "none" },
                            ".Error": { color: GOLD_TEXT },
                        },
                    },
                })
            }
            const existing = elementsRef.current.getElement && elementsRef.current.getElement("payment")
            const el = existing || elementsRef.current.create("payment", { layout: { type: "tabs" }, fields: { billingDetails: { email: "never" } }, wallets: { applePay: "auto", googlePay: "auto" } })
            el.on && el.on("ready", () => setElementReady(true))
            el.on && el.on("change", () => setCardError(""))
            el.mount(cardMount.current)
        }).catch(() => setCardError("Card payment could not load. Please refresh the page, or choose bank wire."))
        return () => { cancelled = true; try { const el = elementsRef.current && elementsRef.current.getElement("payment"); el && el.unmount() } catch (e) {} setElementReady(false) }
    }, [method, data && data.publishableKey])
    useEffect(() => { try { if (elementsRef.current && t.card > 0) elementsRef.current.update({ amount: Math.round(t.card * 100) }) } catch (e) {} }, [t.card])

    if (!data) return <Shell phone={phone}><Skeleton phone={phone} /></Shell>
    if (data.state === "unavailable") return <NoLongerAvailable phone={phone} title={data.title} />
    if (data.state === "paid") return <Message phone={phone} eyebrowText="Already paid" title="This piece is already yours" actions={<a href="/shop" style={primaryBtn()}>Explore the collection</a>}>Your payment for the {data.title || "piece"} has been received. A specialist will be in touch shortly. Questions? Write to <a href="mailto:sales@mintimepieces.com" style={{ color: INK }}>sales@mintimepieces.com</a>.</Message>
    if (data.state === "wire") return <Message phone={phone} eyebrowText="Reserved" title="Your piece is reserved for bank wire" actions={<a href={data.reserveUrl} style={primaryBtn()}>View your reservation</a>}>You chose bank wire for the {data.title}. Your invoice with wire instructions was sent by email from sales@mintimepieces.com.</Message>
    if (!data.ok || data.state !== "open" || !pieces.length) return <Message phone={phone} eyebrowText="Checkout" title="This link is not available" actions={<a href="/shop" style={primaryBtn()}>Explore the collection</a>}>Please use the button in your email from Mint Timepieces, or text us at <a href={SMS} style={{ color: INK, fontWeight: 600 }}>{TEXT_NUMBER}</a> and a specialist will help you.</Message>
    if (cryptoDone != null) return <Message phone={phone} eyebrowText="Cryptocurrency" title="Your payment details are on their way" actions={<a href="/shop" style={primaryBtn()}>Back to the collection</a>}>Thank you, {name.split(/\s+/)[0] || "there"}. A specialist will email your cryptocurrency payment details from sales@mintimepieces.com at <strong>{money(cryptoDone)}</strong>. {CRYPTO_LINE}</Message>

    const needsAddress = delivery === "ca" || delivery === "out"
    const validate = () => {
        const e: Record<string, string> = {}
        if (!delivery) e.delivery = "Please choose where you take delivery."
        if (!name.trim()) e.name = "Please add your full name."
        if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) e.email = "Please check your email address."
        if (needsAddress) {
            if (!addr.line1.trim() || !addr.city.trim() || !addr.postal_code.trim()) e.address = "Please add your full delivery address."
            else if (delivery === "ca" && (addr.country !== "US" || !isCaState(addr.state))) e.address = "This address is outside California. Choose Delivery outside California, or use a California address."
            else if (delivery === "out" && addr.country === "US" && isCaState(addr.state)) e.address = "This address is in California. Choose Delivery in California so the correct sales tax applies."
        }
        if (!method) e.method = "Please choose how you would like to pay."
        setErrors(e)
        return !Object.keys(e).length
    }
    const body = () => ({ ...(q.current.token ? { token: q.current.token } : { items: q.current.items.split(",") }), delivery, contact: { name: name.trim(), email: email.trim(), phone: phoneNo.trim() }, address: needsAddress ? { ...addr, state: delivery === "ca" ? "CA" : addr.state } : null, consent })

    const pay = async () => {
        if (busy || canvas) return
        setPayError(""); setCardError("")
        if (!validate()) { setPayError("Please complete the details marked above."); return }
        setBusy(true)
        try {
            if (method === "wire" || method === "crypto") {
                setStatus(method === "wire" ? "Reserving your piece" : "Sending your request")
                const j = await api({ action: "offline", method, ...body() })
                if (j && j.ok) {
                    if (j.next) { window.location.assign(j.next); return }
                    setCryptoDone(Number(j.total) || t.wire); setBusy(false); return
                }
                if (j && j.state === "unavailable") { setData({ ...data, state: "unavailable" }); return }
                if (j && j.errors) setErrors(j.errors)
                setPayError((j && j.error) || "Please check the details above."); setBusy(false); setStatus(""); return
            }
            // Card
            const stripe = stripeRef.current, elements = elementsRef.current
            if (!stripe || !elements) { setCardError("Card payment is still loading. Please try again in a moment."); setBusy(false); return }
            setStatus("Checking your card")
            const sub = await elements.submit()
            if (sub && sub.error) { setCardError(cardMessage(sub.error)); setBusy(false); setStatus(""); return }
            setStatus("Securing your total")
            const j = await api({ action: "intent", ref: ref.current, ...body() })
            if (!j || !j.ok) {
                if (j && j.state === "unavailable") { setData({ ...data, state: "unavailable" }); return }
                if (j && j.errors) setErrors(j.errors)
                setPayError((j && j.error) || "Please check the details above."); setBusy(false); setStatus(""); return
            }
            ref.current = j.ref
            if (j.already) { window.location.assign("/thank-you?ref=" + j.ref); return }
            setStatus("Confirming with your bank")
            const res = await stripe.confirmPayment({
                elements, clientSecret: j.clientSecret, redirect: "if_required",
                confirmParams: { return_url: SITE + "/thank-you?ref=" + j.ref, payment_method_data: { billing_details: { email: email.trim() } } },
            })
            if (res && res.error) { setCardError(cardMessage(res.error)); setBusy(false); setStatus(""); return }
            setStatus("Payment approved")
            window.location.assign("/thank-you?ref=" + j.ref)
        } catch (e) {
            setPayError("Something went wrong. Nothing was charged. Please try again, or text us at " + TEXT_NUMBER + "."); setBusy(false); setStatus("")
        }
    }

    const cardOff = !data.cardReady
    const payLabel = !method ? "Choose how to pay" : method === "card" ? "Pay " + money(t.card) : method === "wire" ? "Reserve with bank wire · " + money(t.wire) : "Request crypto details · " + money(t.wire)
    const blocked = !method || (method === "card" && (cardOff || !elementReady))

    const form = (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Section n={1} title="Delivery" note={errors.delivery}>
                <div role="radiogroup" aria-label="Where you take delivery" style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    {DELIVERIES.map((o) => {
                        const on = delivery === o.id
                        return <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => { setDelivery(o.id); setErrors((e) => ({ ...e, delivery: "", address: "" })) }} style={{ textAlign: "left", padding: "14px 16px", borderRadius: 16, border: on ? "1.5px solid " + GREEN : "1px solid " + SAGE, background: on ? GREEN : "#fff", color: on ? PALE : INK, fontFamily: FONT, cursor: "pointer", transition: "all 200ms ease", display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{o.label}</span>
                            <span style={{ fontSize: 12.5, color: on ? "rgba(220,228,215,0.75)" : SOFT }}>{o.sub}</span>
                        </button>
                    })}
                </div>
            </Section>
            <Section n={2} title="Your details">
                <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: phone ? "auto" : "1 / -1" }}><Field label="Full name" error={errors.name}><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={inputStyle} /></Field></div>
                    <Field label="Email" error={errors.email}><input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} /></Field>
                    <Field label="Mobile" optional><input type="tel" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} autoComplete="tel" style={inputStyle} /></Field>
                </div>
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 16, fontSize: 13, lineHeight: 1.5, color: "rgba(29,29,31,0.72)", cursor: "pointer" }}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: GREEN, flexShrink: 0 }} />
                    <span>{CONSENT}</span>
                </label>
            </Section>
            {needsAddress ? (
                <Section n={3} title="Delivery address" note={errors.address}>
                    <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : "1fr 1fr", gap: 14 }}>
                        <div style={{ gridColumn: phone ? "auto" : "1 / -1" }}><Field label="Street address"><input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" style={inputStyle} /></Field></div>
                        <div style={{ gridColumn: phone ? "auto" : "1 / -1" }}><Field label="Apartment, suite or floor" optional><input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" style={inputStyle} /></Field></div>
                        <Field label="City"><input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" style={inputStyle} /></Field>
                        {delivery === "ca"
                            ? <Field label="State"><input value="California" readOnly style={{ ...inputStyle, background: CREAM, color: SOFT }} /></Field>
                            : <Field label="State or region"><input value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} autoComplete="address-level1" style={inputStyle} /></Field>}
                        <Field label="ZIP or postal code"><input value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} autoComplete="postal-code" style={inputStyle} /></Field>
                        {delivery === "ca"
                            ? <Field label="Country"><input value="United States" readOnly style={{ ...inputStyle, background: CREAM, color: SOFT }} /></Field>
                            : <Field label="Country"><select value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })} autoComplete="country" style={{ ...inputStyle, appearance: "none", backgroundImage: "linear-gradient(45deg, transparent 50%, rgba(29,29,31,0.5) 50%), linear-gradient(135deg, rgba(29,29,31,0.5) 50%, transparent 50%)", backgroundPosition: "calc(100% - 20px) 50%, calc(100% - 15px) 50%", backgroundSize: "5px 5px", backgroundRepeat: "no-repeat" } as CSSProperties}>{COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></Field>}
                    </div>
                </Section>
            ) : null}
            <Section n={needsAddress ? 4 : 3} title="Payment" note={errors.method}>
                <div role="radiogroup" aria-label="How you would like to pay" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Option id="wire" on={method === "wire"} onPick={(m) => { setMethod(m); setErrors((e) => ({ ...e, method: "" })); setPayError("") }} title="Bank wire" tag="Recommended" sub={"At the listed price with no surcharge · " + money(t.wire)}>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(29,29,31,0.72)" }}>{q.current.token ? "Reserve the piece and receive your invoice by email straight away. It stays held for you for 24 hours from when you opened this checkout." : "Reserve the piece and receive your invoice by email straight away. We hold it for you for 24 hours."} {WIRE_LINE}</div>
                    </Option>
                    <Option id="card" on={method === "card"} onPick={(m) => { setMethod(m); setErrors((e) => ({ ...e, method: "" })); setPayError("") }} title="Card payment through Stripe" sub={"Card, Apple Pay or Google Pay · adds the card payment 2.9% line · " + money(t.card)}>
                        {cardOff ? <div style={{ fontSize: 13.5, lineHeight: 1.5, color: GOLD_TEXT }}>Card payment opens shortly. Please choose bank wire, or text us at {TEXT_NUMBER}.</div> : (
                            <div>
                                {!elementReady ? <div style={{ height: 116, borderRadius: 14, background: `linear-gradient(90deg, ${CREAM} 0%, #fff 50%, ${CREAM} 100%)`, backgroundSize: "800px 100%", animation: "mintShimmer 1.4s linear infinite" }} /> : null}
                                <div ref={cardMount} style={{ minHeight: elementReady ? 0 : 0 }} />
                                {cardError ? <div role="alert" style={{ marginTop: 12, padding: "11px 14px", borderRadius: 12, background: "rgba(165,111,24,0.08)", border: "1px solid rgba(165,111,24,0.3)", fontSize: 13.5, lineHeight: 1.5, color: GOLD_TEXT }}>{cardError}</div> : null}
                            </div>
                        )}
                    </Option>
                    <Option id="crypto" on={method === "crypto"} onPick={(m) => { setMethod(m); setErrors((e) => ({ ...e, method: "" })); setPayError("") }} title="Cryptocurrency" sub={"In US dollars at the wire total · " + money(t.wire)}>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(29,29,31,0.72)" }}>{CRYPTO_LINE}</div>
                    </Option>
                </div>
            </Section>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={pay} disabled={busy || blocked} aria-busy={busy} style={{ ...primaryBtn(busy || blocked), width: "100%", opacity: blocked ? 0.45 : busy ? 0.72 : 1 }}>
                    {busy ? <Spinner /> : null}{busy ? status || "Working" : payLabel}
                </button>
                <div role="status" aria-live="polite" style={{ minHeight: 20, fontSize: 13, lineHeight: 1.5, textAlign: "center", color: payError ? GOLD_TEXT : SOFT }}>
                    {payError || (busy ? "Please keep this page open." : method === "card" ? "Your card is charged only when you tap Pay." : method ? "Nothing is charged on this page." : "Choose a payment method to continue.")}
                </div>
            </div>
            <Trust kind={data.kind || "instant"} />
        </div>
    )

    return (
        <Shell phone={phone}>
            {phone ? (
                <div style={{ position: "sticky", top: 0, zIndex: 5, background: GREEN, borderBottom: "1px solid rgba(201,163,98,0.5)" }}>
                    <button type="button" aria-expanded={openSummary} onClick={() => setOpenSummary((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", background: "transparent", border: 0, color: PALE, fontFamily: FONT, cursor: "pointer" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
                            {openSummary ? "Hide order summary" : "Show order summary"}
                            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: openSummary ? "rotate(180deg)" : "none", transition: "transform 240ms ease" }}><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#F3F6F1" }}>{money(t.total)}</span>
                    </button>
                    <div style={{ display: "grid", gridTemplateRows: openSummary ? "1fr" : "0fr", transition: "grid-template-rows 320ms cubic-bezier(.22,1,.36,1)" }}>
                        <div style={{ overflow: "hidden" }}><Summary pieces={pieces} delivery={delivery} method={method} holdUntilLabel={data.holdUntilLabel} useTax={data.useTax} compact /></div>
                    </div>
                </div>
            ) : null}
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: phone ? "22px 14px 0" : "48px 24px 0" }}>
                <div style={{ marginBottom: phone ? 18 : 28, animation: "mintFade 420ms ease both" }}>
                    <div style={eyebrow}>{data.kind === "reservation" ? "Confirmed available" : "Checkout"}</div>
                    <h1 style={{ margin: "8px 0 0", fontSize: phone ? 28 : 38, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.03em" }}>{data.kind === "reservation" ? "Your piece is ready for you" : "Complete your purchase"}</h1>
                </div>
                {phone ? form : (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.22fr) minmax(0, 1fr)", gap: 32, alignItems: "start" }}>
                        {form}
                        <div style={{ position: "sticky", top: 28 }}><Summary pieces={pieces} delivery={delivery} method={method} holdUntilLabel={data.holdUntilLabel} useTax={data.useTax} /></div>
                    </div>
                )}
            </div>
        </Shell>
    )
}
addPropertyControls(MintCheckout, {
    preview: { type: ControlType.Enum, title: "Design preview", options: ["off", "open", "wire", "card", "unavailable"], optionTitles: ["Off", "Open", "Bank wire chosen", "Card chosen", "No longer available"], defaultValue: "off" },
})

function Trust({ kind }: { kind: string }) {
    const item = (icon: ReactNode, title: string, text: ReactNode) => (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ width: 34, height: 34, borderRadius: 12, background: PALE, color: GREEN, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span><span style={{ fontSize: 13, lineHeight: 1.5, color: SOFT }}>{text}</span></span>
        </div>
    )
    return (
        <div style={{ ...panel, padding: 20, display: "grid", gap: 16, background: "rgba(255,255,255,0.6)", boxShadow: "none" }}>
            {item(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>, "Authenticity guaranteed", "Every piece is examined before it is listed, and we stand behind its authenticity. If a piece is ever shown not to be authentic, you receive a full refund.")}
            {item(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>, kind === "reservation" ? "All sales final" : "Returns and final sale", kind === "reservation" ? <>Watches and bespoke jewelry are final sale, as set out in our <a href="/terms" style={{ color: INK }}>Terms and Conditions</a>.</> : <>Accessories and select handbags may be returned within 48 hours of delivery; every other sale is final, as set out in our <a href="/terms" style={{ color: INK }}>Terms and Conditions</a>.</>)}
            {item(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="m4.5 7.5 7.5 5.5 7.5-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>, "Here to help", <>Write to <a href="mailto:sales@mintimepieces.com" style={{ color: INK }}>sales@mintimepieces.com</a> or text <a href={SMS} style={{ color: INK, whiteSpace: "nowrap" }}>{TEXT_NUMBER}</a>.</>)}
        </div>
    )
}

function Skeleton({ phone }: { phone: boolean }) {
    const bar = (h: number, w = "100%"): CSSProperties => ({ height: h, width: w, borderRadius: 16, background: `linear-gradient(90deg, #EFEAE2 0%, #F8F5F0 50%, #EFEAE2 100%)`, backgroundSize: "800px 100%", animation: "mintShimmer 1.4s linear infinite" })
    return (
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: phone ? "28px 14px" : "48px 24px", display: "grid", gridTemplateColumns: phone ? "1fr" : "1.22fr 1fr", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><div style={bar(38, "60%")} /><div style={bar(150)} /><div style={bar(220)} /><div style={bar(260)} /></div>
            {phone ? null : <div style={{ ...bar(380), background: GREEN, opacity: 0.9 }} />}
        </div>
    )
}

/**
 * The thank you page. Place it alone on the /thank-you page at full width.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export function ThankYou(props: { style?: CSSProperties }) {
    useFonts()
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const phone = useIsPhone()
    const [r, setR] = useState<any>(canvas ? { ok: true, kind: "instant", ref: "MTC4K7Q2B", total: 355.96, first: "Alex", delivery: "ca", deliveryLabel: "Delivery in California", pieces: [{ title: "Rolex Keyring 18K Gold Plated" }] } : null)
    useEffect(() => {
        if (canvas || typeof window === "undefined") return
        const p = new URLSearchParams(window.location.search)
        const refq = (p.get("ref") || "").toUpperCase()
        if (!refq) { setR({ ok: false, state: "invalid" }); return }
        let tries = 0
        const ask = () => api({ action: "status", ref: refq }).then((j) => {
            if (j && j.ok) {
                setR(j)
                // The paid pieces leave the bag.
                try { const bag = JSON.parse(window.localStorage.getItem(BAG_KEY) || "[]"); const paid = new Set((j.pieces || []).map((x: any) => x.slug)); const left = Array.isArray(bag) ? bag.filter((i: any) => !paid.has(i.slug)) : []; window.localStorage.setItem(BAG_KEY, JSON.stringify(left)); window.dispatchEvent(new CustomEvent("mint-bag-change")) } catch (e) {}
            } else if (j && j.state === "processing" && tries++ < 8) setTimeout(ask, 2500)
            else setR(j || { ok: false, state: "invalid" })
        }).catch(() => setR({ ok: false, state: "invalid" }))
        ask()
    }, [])
    if (!r) return <Message phone={phone} eyebrowText="One moment" title="Confirming your payment"><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span style={{ width: 16, height: 16, borderRadius: 99, border: "2px solid rgba(30,58,42,0.2)", borderTopColor: GREEN, animation: "mintSpin 800ms linear infinite", display: "inline-block" }} />We are confirming your payment with your bank.</span></Message>
    if (!r.ok && r.state === "processing") return <Message phone={phone} eyebrowText="Processing" title="Your payment is processing">Your bank is still confirming the payment. You will receive an email from sales@mintimepieces.com the moment it completes. Nothing more is needed from you.</Message>
    if (!r.ok) return <Message phone={phone} eyebrowText="Not completed" title="Your payment was not completed" actions={<><a href="/shop" style={primaryBtn()}>Back to the collection</a><a href={SMS} style={quietLink}>Text us</a></>}>Nothing was charged and no order was created. You can return to the piece and try again, or text us at {TEXT_NUMBER} and a specialist will help.</Message>
    const titles = (r.pieces || []).map((p: any) => p.title)
    const what = titles.length === 1 ? "the " + titles[0] : titles.length + " pieces"
    const next = r.delivery === "pickup" ? "A specialist will text you shortly to arrange a time to collect it in Los Angeles." : "Your piece is now being prepared with care. Once it ships, you will receive an email with your tracking number."
    return (
        <Message phone={phone} eyebrowText="Payment received" title={r.first ? `Thank you, ${r.first}` : "Thank you"}
            actions={<><a href="/shop" style={primaryBtn()}>Explore the collection</a><a href="mailto:sales@mintimepieces.com" style={quietLink}>sales@mintimepieces.com</a></>}>
            <p style={{ margin: "0 0 18px" }}>Your payment for {what} is complete. {next}</p>
            <div style={{ display: "grid", gap: 10, padding: 18, borderRadius: 18, background: CREAM, border: "1px solid " + SAGE, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: SOFT }}>Order reference</span><strong style={{ letterSpacing: "0.04em" }}>{r.ref}</strong></div>
                {r.orderNo ? <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: SOFT }}>Order number</span><strong>{r.orderNo}</strong></div> : null}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: SOFT }}>{r.deliveryLabel ? r.deliveryLabel : "Delivery"}</span><span /></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: SOFT }}>Total paid</span><strong>{money(r.total)}</strong></div>
            </div>
            <p style={{ margin: "18px 0 0", fontSize: 14, color: SOFT }}>A receipt is on its way to {r.email || "your email"}. Questions? Write to sales@mintimepieces.com.</p>
        </Message>
    )
}
addPropertyControls(ThankYou, {})
