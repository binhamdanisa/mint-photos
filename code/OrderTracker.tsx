import { useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

// Order tracking. Each order's private status page lives at /track/<key>, where the key is a
// SHA-256 of the exact order number and the email on the order. Without both values exactly,
// no page can be found. Orders are never listed or browsable anywhere on the site.

const INK = "#1d1d1f"
const SUB = "rgb(49, 54, 48)"
const GOLD = "#a56f18"
const FONT = "'Bricolage Grotesque', sans-serif"
const MUTED = "var(--token-5befc44e-9d08-4683-96c0-ff439142bf85, rgba(49, 54, 48, 0.75))"
const NOT_FOUND = "We could not find an order with those details. Check the order number and email, or contact us and we will help."
const STEPS = ["Order Placed", "Payment Confirmed", "Authentication and Preparation", "Shipped", "Out for Delivery", "Delivered"]

export function normalizeOrder(n: string) { return (n || "").toUpperCase().replace(/[^A-Z0-9]/g, "") }
export async function orderKey(orderNumber: string, email: string): Promise<string> {
    const data = new TextEncoder().encode(normalizeOrder(orderNumber) + "|" + (email || "").trim().toLowerCase())
    const buf = await crypto.subtle.digest("SHA-256", data)
    return "o" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32)
}

const glass: CSSProperties = { background: "linear-gradient(180deg, rgba(220,228,215,0.7), rgba(212,220,207,0.55))", backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 50px -30px rgba(29,29,31,0.35)", borderRadius: 24 }
const input: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "14px 14px", borderRadius: 12, border: "1px solid rgba(29,29,31,0.14)", background: "#fff", fontFamily: FONT, fontSize: 16, color: INK, outline: "none" }
const lbl: CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUB, marginBottom: 8 }

interface LookupProps { mode: "lookup" | "keyHelper"; style?: CSSProperties }

/**
 * Track Your Order lookup for the account page.
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function OrderLookup(props: LookupProps) {
    const { mode = "lookup", style } = props
    const [num, setNum] = useState("")
    const [email, setEmail] = useState("")
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState("")
    const [key, setKey] = useState("")
    const submit = async (e: any) => {
        e.preventDefault()
        setMsg(""); setKey("")
        if (!normalizeOrder(num) || !email.trim()) { setMsg(NOT_FOUND); return }
        setBusy(true)
        try {
            const k = await orderKey(num, email)
            if (mode === "keyHelper") { setKey(k); return }
            const url = "/track/" + k
            const res = await fetch(url, { method: "GET", cache: "no-store" })
            if (res.ok) window.location.href = url
            else setMsg(NOT_FOUND)
        } catch (x) { setMsg(NOT_FOUND) } finally { setBusy(false) }
    }
    return (
        <div id="track" style={{ ...glass, width: "100%", boxSizing: "border-box", padding: 24, fontFamily: FONT, color: INK, display: "flex", flexDirection: "column", gap: 16, ...style }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUB }}>{mode === "keyHelper" ? "Internal tool" : "Order status"}</span>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{mode === "keyHelper" ? "Order lookup key" : "Track Your Order"}</span>
                <span style={{ fontSize: 15, lineHeight: 1.5, color: MUTED }}>{mode === "keyHelper" ? "Enter an order number and the client email exactly as on the order, then paste the key into that order's Lookup Key field." : "Enter your order number and the email used on the order."}</span>
            </div>
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>
                <div><label style={lbl} htmlFor={"ot-num-" + mode}>Order number</label><input id={"ot-num-" + mode} value={num} onChange={(e) => setNum(e.target.value)} placeholder="MT 1042" autoComplete="off" style={input} /></div>
                <div><label style={lbl} htmlFor={"ot-mail-" + mode}>Email</label><input id={"ot-mail-" + mode} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={input} /></div>
                <button type="submit" disabled={busy} style={{ padding: "15px 22px", borderRadius: 999, border: 0, background: INK, color: "#fff", fontFamily: FONT, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.7 : 1, whiteSpace: "nowrap" }}>{busy ? "Checking" : mode === "keyHelper" ? "Make key" : "Track order"}</button>
            </form>
            {msg ? <div role="status" style={{ fontSize: 14, lineHeight: 1.5, color: SUB }}>{msg}</div> : null}
            {key ? <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fff", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, wordBreak: "break-all", userSelect: "all" }}>{key}</div> : null}
        </div>
    )
}
addPropertyControls(OrderLookup, {
    mode: { type: ControlType.Enum, title: "Mode", options: ["lookup", "keyHelper"], optionTitles: ["Client lookup", "Key helper (internal)"], defaultValue: "lookup" },
})

// ---- Result view for the /track/<key> page
interface StatusProps {
    orderNumber: string; productTitle: string; productSlug: string; image?: { src?: string; srcSet?: string; alt?: string }
    amount: number; paymentMethod: string; status: string; carrier: string; trackingNumber: string; updatedAt: string
    style?: CSSProperties
}
function carrierLink(carrier: string, n: string) {
    const c = (carrier || "").toLowerCase(), t = encodeURIComponent(n)
    if (/ups/.test(c)) return "https://www.ups.com/track?tracknum=" + t
    if (/fedex/.test(c)) return "https://www.fedex.com/fedextrack/?trknbr=" + t
    if (/usps|postal/.test(c)) return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + t
    if (/dhl/.test(c)) return "https://www.dhl.com/us-en/home/tracking/tracking-express.html?tracking-id=" + t
    return ""
}
const fmtDate = (s: string) => { if (!s) return ""; const d = new Date(s); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function OrderStatus(props: StatusProps) {
    const { orderNumber = "MT 1042", productTitle = "Rolex Submariner Date", productSlug = "", image, amount = 0, paymentMethod = "PayPal", status = "Order Placed", carrier = "", trackingNumber = "", updatedAt = "", style } = props
    const onHold = /hold/i.test(status)
    const cur = Math.max(0, STEPS.findIndex((s) => s.toLowerCase() === (status || "").toLowerCase()))
    const shipped = !onHold && cur >= 3
    const link = carrierLink(carrier, trackingNumber)
    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16, fontFamily: FONT, color: INK, ...style }}>
            <div style={{ ...glass, padding: 22, display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ width: 92, height: 92, flexShrink: 0, borderRadius: 16, background: "#dce4d7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {image && image.src ? <img src={image.src} srcSet={image.srcSet} alt={productTitle} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUB }}>Order {orderNumber}</span>
                    {productSlug ? <a href={"/shop/" + productSlug} style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: INK, textDecoration: "none" }}>{productTitle}</a> : <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{productTitle}</span>}
                    <span style={{ fontSize: 15, color: MUTED }}>{"$" + Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} · {paymentMethod}</span>
                </div>
            </div>
            <div style={{ ...glass, background: "rgba(255,255,255,0.8)", padding: 24 }}>
                {onHold ? <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "rgba(165,111,24,0.1)", color: INK, fontSize: 15, fontWeight: 600 }}>On Hold{updatedAt ? " since " + fmtDate(updatedAt) : ""}. Our team will be in touch with you directly.</div> : null}
                {STEPS.map((s, i) => {
                    const done = !onHold && i < cur, current = !onHold && i === cur, last = i === STEPS.length - 1
                    return (
                        <div key={s} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 14 }}>
                            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                                {!last ? <span style={{ position: "absolute", top: 22, bottom: -2, width: 1.5, background: done ? GOLD : "rgba(29,29,31,0.14)" }} /> : null}
                                <span style={{ position: "relative", marginTop: 2, width: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: done ? GOLD : current ? INK : "#fff", border: done || current ? "0" : "1.5px solid rgba(29,29,31,0.22)", boxShadow: current ? "0 0 0 5px rgba(29,29,31,0.08)" : "none" }}>
                                    {done ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> : current ? <span style={{ width: 6, height: 6, borderRadius: 9, background: "#fff" }} /> : null}
                                </span>
                            </div>
                            <div style={{ paddingBottom: last ? 0 : 22, display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 16, fontWeight: current ? 700 : 600, color: done || current ? INK : "rgba(29,29,31,0.45)" }}>{s}</span>
                                {current && updatedAt ? <span style={{ fontSize: 13, color: MUTED }}>{fmtDate(updatedAt)}</span> : null}
                                {current && shipped && trackingNumber ? (
                                    <span style={{ fontSize: 14, color: INK }}>{carrier ? carrier + " · " : ""}{link ? <a href={link} target="_blank" rel="noopener" style={{ color: INK }}>{trackingNumber}</a> : trackingNumber}</span>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
                {!onHold && cur > 3 && trackingNumber ? <div style={{ marginTop: 16, fontSize: 14 }}>{carrier ? carrier + " · " : ""}{link ? <a href={link} target="_blank" rel="noopener" style={{ color: INK }}>{trackingNumber}</a> : trackingNumber}</div> : null}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>Questions about your order? Reply to your confirmation email or contact sales@mintimepieces.com.</div>
            <a href="/account#track" style={{ fontSize: 14, fontWeight: 600, color: INK }}>Track another order</a>
        </div>
    )
}
addPropertyControls(OrderStatus, {
    orderNumber: { type: ControlType.String, title: "Order number" },
    productTitle: { type: ControlType.String, title: "Product" },
    productSlug: { type: ControlType.String, title: "Product slug" },
    image: { type: ControlType.ResponsiveImage, title: "Image" },
    amount: { type: ControlType.Number, title: "Amount" },
    paymentMethod: { type: ControlType.String, title: "Payment" },
    status: { type: ControlType.String, title: "Status" },
    carrier: { type: ControlType.String, title: "Carrier" },
    trackingNumber: { type: ControlType.String, title: "Tracking no." },
    updatedAt: { type: ControlType.String, title: "Updated at" },
})
