import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Watch purchase flow: no watch is paid for cold.
// Both payment buttons and Confirm Availability open the same availability panel.
// Approved clients receive this product's page link with ?pay=1, which shows live payment
// for the exact listed price (PayPal first, Mercury bank transfer second).
// Accessories (Category "Accessories") render nothing here and keep their own checkout.

const INK = "#1d1d1f"
const SAGE = "#dce4d7"
const GOLD = "#a56f18"
const FONT = "'Geist', 'Bricolage Grotesque', sans-serif"
const TOP_LINE = "Every piece is confirmed by hand before payment, so you never pay for a watch that is no longer available. Most confirmations take about 10 minutes."
const CONSENT = "Yes, Mint Timepieces may text and email me about this watch and similar pieces. Message and data rates may apply. Reply STOP to a text to opt out at any time."
const DONE = "Request received. Most confirmations take about 10 minutes. We will message you the moment yours is confirmed, with secure payment links for the exact listed price."
const PAYPAL_CLIENT_ID = "BAATnNHusU1KjFbT1RfSvuMchWXYz4LYSB6hbSrAvQdk7QtLkjo9lFn4ic_imRVAQsVt4OADktdjqw5_yA"

const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })

interface Props {
    title: string
    slug: string
    reference: string
    price: number
    category: string
    status: string
    mercuryLink: string
    webhookUrl: string
    fallbackText: string
    style?: CSSProperties
}

function PayPalButton({ price, title }: { price: number; title: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [paid, setPaid] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el || !price || RenderTarget.current() === RenderTarget.canvas) return
        const render = () => {
            const pp = (window as any).paypal
            if (!pp || !el) return
            el.innerHTML = ""
            pp.Buttons({
                style: { layout: "vertical", color: "black", shape: "pill", label: "pay", height: 48 },
                createOrder: (_: any, actions: any) => actions.order.create({ purchase_units: [{ description: title.slice(0, 120), amount: { currency_code: "USD", value: price.toFixed(2) } }] }),
                onApprove: (_: any, actions: any) => actions.order.capture().then(() => setPaid(true)),
            }).render(el)
        }
        if ((window as any).paypal) { render(); return }
        const s = document.createElement("script")
        s.src = "https://www.paypal.com/sdk/js?client-id=" + PAYPAL_CLIENT_ID + "&currency=USD&components=buttons&disable-funding=paylater,venmo,card,credit"
        s.onload = render
        document.body.appendChild(s)
    }, [price, title])
    if (paid) return <div style={{ padding: 16, borderRadius: 16, background: SAGE, fontSize: 15, fontWeight: 600 }}>Payment received. Thank you, your specialist will be in touch shortly about delivery.</div>
    return <div ref={ref} style={{ minHeight: 48 }} />
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function AvailabilityFlow(props: Props) {
    const { title = "Rolex Submariner Date", slug = "", reference = "", price = 0, category = "Watches", status = "Available", mercuryLink = "", webhookUrl = "", fallbackText = "+14242487674", style } = props
    const [open, setOpen] = useState(false)
    const [payView, setPayView] = useState(false)
    const [name, setName] = useState("")
    const [mobile, setMobile] = useState("")
    const [email, setEmail] = useState("")
    const [consent, setConsent] = useState(false)
    const [sent, setSent] = useState(false)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState("")
    useEffect(() => {
        if (typeof window === "undefined") return
        try { setPayView(new URLSearchParams(window.location.search).get("pay") === "1") } catch (e) {}
    }, [])
    useEffect(() => {
        if (typeof document === "undefined" || RenderTarget.current() === RenderTarget.canvas) return
        document.body.style.overflow = open ? "hidden" : ""
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
        window.addEventListener("keydown", onKey)
        return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey) }
    }, [open])

    if ((category || "").trim().toLowerCase() === "accessories") return null
    if ((status || "").toLowerCase() === "sold") return null

    const btnBase: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "15px 18px", borderRadius: 999, fontFamily: FONT, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 200ms ease, background 200ms ease" }
    const input: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "14px 14px", borderRadius: 12, border: "1px solid rgba(29,29,31,0.14)", background: "#fff", fontFamily: FONT, fontSize: 16, color: INK, outline: "none" }
    const label: CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(29,29,31,0.6)", marginBottom: 6, display: "block" }

    const submit = async (e: any) => {
        e.preventDefault()
        if (busy) return
        setErr("")
        if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Please add your name and a valid email."); return }
        const pageUrl = typeof window !== "undefined" ? window.location.origin + "/shop/" + slug : "/shop/" + slug
        const payload = {
            productTitle: title, productSlug: slug, reference, listedPrice: Number(price) || 0,
            clientName: name.trim(), clientMobile: mobile.trim(), clientEmail: email.trim(),
            consent: consent ? "yes" : "no",
            channelPreference: mobile.trim() && consent ? "text" : "email",
            status: "Pending", createdAt: new Date().toISOString(),
            productPage: pageUrl, paymentPage: pageUrl + "?pay=1",
        }
        setBusy(true)
        try {
            if (webhookUrl) {
                await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            } else {
                // Until the automation webhook is connected, the request reaches the team by text.
                const body = "Availability request: " + title + " at " + money(price) + "\nRef. " + (reference || "n/a") + "\nName: " + payload.clientName + "\nMobile: " + (payload.clientMobile || "none") + "\nEmail: " + payload.clientEmail + "\nConsent to message: " + payload.consent + "\n" + pageUrl
                const sep = /iPhone|iPad|Mac/i.test(navigator.userAgent) ? "&" : "?"
                window.location.href = "sms:" + fallbackText + sep + "body=" + encodeURIComponent(body)
            }
            setSent(true)
        } catch (x) {
            setErr("Something went wrong sending your request. Please try again, or text us.")
        } finally { setBusy(false) }
    }

    const Product = () => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 16, background: "rgba(220,228,215,0.55)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{title}</span>
                {reference ? <span style={{ fontSize: 13, color: "rgba(29,29,31,0.6)" }}>Ref. {reference}</span> : null}
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{money(price)}</span>
        </div>
    )

    if (payView) {
        return (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, color: INK, ...style }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD }}>Confirmed available</div>
                <Product />
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(29,29,31,0.7)" }}>Your piece is reserved for 24 hours from your confirmation message. Complete payment below.</div>
                <PayPalButton price={Number(price) || 0} title={title} />
                {mercuryLink ? <a href={mercuryLink} target="_blank" rel="noopener" style={{ ...btnBase, background: "#fff", color: INK, border: "1px solid rgba(29,29,31,0.18)", textDecoration: "none" }}>Pay by Bank · ACH</a> : null}
            </div>
        )
    }

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT, ...style }}>
            <button type="button" onClick={() => setOpen(true)} style={{ ...btnBase, border: 0, background: INK, color: "#fff" }}>Confirm Availability</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button type="button" onClick={() => setOpen(true)} style={{ ...btnBase, fontSize: 14, background: "#fff", color: INK, border: "1px solid rgba(29,29,31,0.16)" }}>Buy with PayPal</button>
                <button type="button" onClick={() => setOpen(true)} style={{ ...btnBase, fontSize: 14, background: "#fff", color: INK, border: "1px solid rgba(29,29,31,0.16)" }}>Pay by Bank · ACH</button>
            </div>
            {open ? (
                <div role="dialog" aria-modal="true" aria-label="Confirm availability" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(29,29,31,0.32)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "calc(100vh - 24px)", overflowY: "auto", boxSizing: "border-box", borderRadius: 26, background: "rgba(248,245,240,0.96)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 30px 80px -30px rgba(29,29,31,0.5)", padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: INK, marginBottom: "max(0px, calc((100vh - 640px) / 2))" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(29,29,31,0.78)" }}>{TOP_LINE}</p>
                            <button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, border: 0, background: "rgba(29,29,31,0.06)", cursor: "pointer", fontSize: 18, color: INK }}>×</button>
                        </div>
                        <Product />
                        {sent ? (
                            <div style={{ padding: 16, borderRadius: 16, background: SAGE, fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>{DONE}</div>
                        ) : (
                            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div><label style={label} htmlFor="af-name">Your name</label><input id="af-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={input} /></div>
                                <div><label style={label} htmlFor="af-mobile">Mobile number (optional)</label><input id="af-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="tel" style={input} /></div>
                                <div><label style={label} htmlFor="af-email">Email</label><input id="af-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={input} /></div>
                                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.45, color: "rgba(29,29,31,0.72)", cursor: "pointer" }}>
                                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: INK, flexShrink: 0 }} />
                                    <span>{CONSENT}</span>
                                </label>
                                {err ? <div style={{ fontSize: 13, color: "rgb(150, 38, 38)" }}>{err}</div> : null}
                                <button type="submit" disabled={busy} style={{ ...btnBase, border: 0, background: INK, color: "#fff", opacity: busy ? 0.7 : 1 }}>{busy ? "Sending" : "Request Confirmation"}</button>
                            </form>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

addPropertyControls(AvailabilityFlow, {
    title: { type: ControlType.String, title: "Title", defaultValue: "Rolex Submariner Date" },
    slug: { type: ControlType.String, title: "Slug", defaultValue: "" },
    reference: { type: ControlType.String, title: "Reference", defaultValue: "" },
    price: { type: ControlType.Number, title: "Price", defaultValue: 0, min: 0 },
    category: { type: ControlType.String, title: "Category", defaultValue: "Watches" },
    status: { type: ControlType.String, title: "Status", defaultValue: "Available" },
    mercuryLink: { type: ControlType.String, title: "Mercury link", defaultValue: "" },
    webhookUrl: { type: ControlType.String, title: "Webhook URL", defaultValue: "" },
    fallbackText: { type: ControlType.String, title: "Fallback text no.", defaultValue: "+14242487674" },
})
