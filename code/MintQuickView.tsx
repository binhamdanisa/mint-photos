import { useEffect, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { RenderTarget } from "framer"

/**
 * Quick view in place (Script 19 E2).
 * Tapping the image area of a product card opens a larger view over the collection with the key facts,
 * what is included, and the right action for the piece. Closing returns the client to the exact place.
 * Watches offer the availability action only. Accessories and jewelry offer the purchase action and Add to tray.
 * Lives once in the Nav & Footer layout.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

const INK = "rgb(49, 54, 48)"
const SAND = "#f8f5f0"
const SAGE = "#e2e8de"
const BRASS = "#a56f18"
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const FONT = "'Bricolage Grotesque', system-ui, sans-serif"

type Piece = {
    href: string
    title: string
    brand: string
    image: string
    price: number | null
    sold: boolean
    soon: boolean
    kind: "watch" | "piece"
    facts: Array<[string, string]>
    included: string
    loading: boolean
}

const cache = new Map<string, Promise<Partial<Piece>>>()

const LABELS: Record<string, string> = { reference: "Reference", "case size": "Case size", year: "Year", condition: "Condition", movement: "Movement", material: "Material" }

function parse(html: string, href: string): Partial<Piece> {
    const doc = new DOMParser().parseFromString(html, "text/html")
    let product: any = null
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try {
            const j = JSON.parse(s.textContent || "null")
            const list = Array.isArray(j) ? j : [j]
            for (const x of list) if (x && x["@type"] === "Product") product = x
        } catch (e) {}
    })
    const out: Partial<Piece> = {}
    if (product) {
        out.title = product.name || ""
        out.brand = (product.brand && product.brand.name) || ""
        out.image = Array.isArray(product.image) ? product.image[0] : product.image || ""
        const offer = product.offers || {}
        out.price = offer.price ? Number(offer.price) : null
        const av = String(offer.availability || "")
        out.sold = /SoldOut|OutOfStock|Discontinued/i.test(av)
        out.soon = /PreOrder|PreSale/i.test(av)
        out.kind = /access|jewel|handbag|collect/i.test(product.category || "") || /^\/jewelry\//.test(href) ? "piece" : "watch"
    }
    const facts: Array<[string, string]> = []
    const spec = doc.querySelector('[data-framer-name="Specifications"]')
    if (spec) {
        for (const row of Array.from(spec.children)) {
            const texts = Array.from(row.querySelectorAll("span")).map((t) => (t.textContent || "").trim()).filter(Boolean)
            if (texts.length < 2) continue
            const label = texts[0].toLowerCase()
            const value = texts.find((t, i) => i > 0 && t.toLowerCase() !== label) || ""
            if (!value) continue
            if (label === "included") { out.included = value; continue }
            if (LABELS[label] && !facts.some((f) => f[0] === LABELS[label])) facts.push([LABELS[label], value])
        }
    }
    if (!out.included) {
        const inc = doc.querySelector('[data-framer-name="Included"]')
        const texts = inc ? Array.from(inc.querySelectorAll("span")).map((t) => (t.textContent || "").trim()).filter(Boolean) : []
        if (texts.length > 1) out.included = texts.find((t, i) => i > 0 && t.toLowerCase() !== texts[0].toLowerCase()) || ""
    }
    out.facts = facts
    return out
}

function load(href: string) {
    if (!cache.has(href)) cache.set(href, fetch(href, { credentials: "same-origin" }).then((r) => r.text()).then((h) => parse(h, href)).catch(() => ({})))
    return cache.get(href)!
}

const money = (n: number | null) => (n == null || !isFinite(n) ? "" : "$" + Math.round(n).toLocaleString("en-US"))

function cardFor(target: Element | null): { a: HTMLAnchorElement; href: string } | null {
    if (!target || !target.closest) return null
    if (target.closest('button,[role="button"],input,select,textarea,label,[data-no-quickview]')) return null
    const a = target.closest("a[href]") as HTMLAnchorElement | null
    if (!a) return null
    let url: URL
    try { url = new URL(a.href, location.href) } catch (e) { return null }
    if (url.origin !== location.origin || !/^\/(shop|jewelry)\/[^/]+\/?$/.test(url.pathname)) return null
    if (url.pathname.replace(/\/$/, "") === location.pathname.replace(/\/$/, "")) return null
    // Only the image area of a card opens quick view; the rest of the card keeps its link.
    const img = target.closest('img,picture,[data-framer-name="Media"],[data-framer-name="Photo"],[data-framer-name="Image"]')
    if (!img || !a.contains(img)) return null
    const r = a.getBoundingClientRect()
    if (r.height < 140) return null
    return { a, href: url.pathname }
}

function fromCard(a: HTMLAnchorElement, href: string): Piece {
    const img = a.querySelector("img") as HTMLImageElement | null
    const text = (sel: string) => { const el = a.querySelector(`[data-framer-name="${sel}"]`); return el ? (el.textContent || "").trim() : "" }
    const priceText = text("Price").replace(/[^0-9.]/g, "")
    return {
        href,
        title: text("Title") || (img && img.alt) || "",
        brand: text("Brand"),
        image: (img && (img.currentSrc || img.src)) || "",
        price: priceText ? Number(priceText) : null,
        sold: /\bsold\b/i.test(a.textContent || ""),
        soon: /coming soon/i.test(a.textContent || ""),
        kind: /^\/jewelry\//.test(href) ? "piece" : "watch",
        facts: [],
        included: text("Included"),
        loading: true,
    }
}

declare global {
    interface Window { MintTray?: { add: (p: any) => void } }
}

export default function MintQuickView() {
    const [piece, setPiece] = useState<Piece | null>(null)
    const [shown, setShown] = useState(false)
    const [phone, setPhone] = useState(false)
    const opener = useRef<HTMLAnchorElement | null>(null)
    const bypass = useRef(false)
    const closeBtn = useRef<HTMLButtonElement>(null)
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        const mq = window.matchMedia("(max-width: 767.98px)")
        const setP = () => setPhone(mq.matches)
        setP()
        mq.addEventListener ? mq.addEventListener("change", setP) : mq.addListener(setP)
        const onClick = (e: MouseEvent) => {
            if (bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const hit = cardFor(e.target as Element)
            if (!hit) return
            e.preventDefault()
            e.stopPropagation()
            opener.current = hit.a
            const base = fromCard(hit.a, hit.href)
            setPiece(base)
            requestAnimationFrame(() => setShown(true))
            load(hit.href).then((d) => setPiece((p) => (p && p.href === hit.href ? { ...p, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== "" && v != null)), loading: false } as Piece : p)))
        }
        const warm = (e: Event) => { const hit = cardFor(e.target as Element); if (hit) load(hit.href) }
        window.addEventListener("click", onClick, true)
        document.addEventListener("pointerover", warm, { passive: true })
        document.addEventListener("touchstart", warm, { passive: true })
        return () => {
            window.removeEventListener("click", onClick, true)
            document.removeEventListener("pointerover", warm)
            document.removeEventListener("touchstart", warm)
        }
    }, [])

    // Keep the page exactly where it was: lock scroll without moving it.
    useEffect(() => {
        if (!piece) return
        const html = document.documentElement
        const prev = html.style.overflow, prevPad = html.style.paddingRight
        const gap = window.innerWidth - html.clientWidth
        html.style.overflow = "hidden"
        if (gap > 0) html.style.paddingRight = gap + "px"
        const key = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
        window.addEventListener("keydown", key)
        setTimeout(() => closeBtn.current && closeBtn.current.focus({ preventScroll: true }), 60)
        return () => { html.style.overflow = prev; html.style.paddingRight = prevPad; window.removeEventListener("keydown", key) }
    }, [!!piece])

    const close = () => {
        setShown(false)
        setTimeout(() => { setPiece(null); opener.current && opener.current.focus({ preventScroll: true }) }, reduce ? 0 : 320)
    }

    const go = () => {
        const a = opener.current
        setShown(false)
        setPiece(null)
        if (!a) return
        bypass.current = true
        a.click()
        setTimeout(() => (bypass.current = false), 0)
    }

    const addToTray = () => {
        if (!piece || !window.MintTray) return
        window.MintTray.add({ slug: piece.href.split("/").pop(), href: piece.href, title: piece.title, brand: piece.brand, price: piece.price, image: piece.image })
    }

    if (!piece || typeof document === "undefined") return null

    const t = reduce ? "none" : `opacity 320ms ${EASE}, transform 520ms ${EASE}`
    const isPiece = piece.kind === "piece"
    const facts = piece.facts
    const status = piece.sold ? "Sold" : piece.soon ? "Coming soon" : ""
    const btn = (primary: boolean): CSSProperties => ({ flex: 1, minHeight: 50, padding: "0 22px", borderRadius: 999, border: primary ? "0" : `1px solid ${SAGE}`, background: primary ? INK : "#fff", color: primary ? "#fff" : INK, fontFamily: FONT, fontSize: 15, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" })

    const panel = (
        <div role="dialog" aria-modal="true" aria-label={piece.title || "Quick view"} data-mm-skip=""
            style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "flex", alignItems: phone ? "flex-end" : "center", justifyContent: "center", padding: phone ? 0 : 32, fontFamily: FONT, color: INK }}>
            <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(29, 33, 28, 0.42)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", opacity: shown ? 1 : 0, transition: reduce ? "none" : `opacity 320ms ${EASE}` }} />
            <div style={{ position: "relative", width: phone ? "100%" : "min(980px, 100%)", maxHeight: phone ? "92dvh" : "min(640px, calc(100dvh - 64px))", background: SAND, borderRadius: phone ? "24px 24px 0 0" : 28, overflow: "hidden", display: "flex", flexDirection: phone ? "column" : "row", boxShadow: "0 40px 80px -30px rgba(20, 28, 22, 0.45)", opacity: shown ? 1 : 0, transform: shown ? "none" : phone ? "translateY(24px)" : "translateY(16px)", transition: t }}>
                <button ref={closeBtn} type="button" onClick={close} aria-label="Close quick view" style={{ position: "absolute", top: 14, right: 14, zIndex: 2, width: 44, height: 44, borderRadius: 999, border: 0, background: "rgba(255,255,255,0.86)", color: INK, cursor: "pointer", display: "grid", placeItems: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
                <div style={{ flex: phone ? "0 0 auto" : "1 1 52%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: phone ? "4 / 3" : undefined, minHeight: phone ? undefined : 420, padding: phone ? 20 : 36 }}>
                    {piece.image ? <img src={piece.image} alt={piece.title} style={{ maxWidth: "100%", maxHeight: phone ? "100%" : 520, width: "auto", height: "100%", objectFit: "contain", display: "block" }} /> : null}
                </div>
                <div style={{ flex: "1 1 48%", display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <div style={{ padding: phone ? "20px 22px 8px" : "40px 40px 12px", overflowY: "auto", flex: "1 1 auto" }}>
                        {piece.brand ? <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: BRASS }}>{piece.brand}</div> : null}
                        <div style={{ fontSize: phone ? 24 : 30, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.02em", marginTop: 8 }}>{piece.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                            {piece.price && !piece.sold ? <div style={{ fontSize: 20, fontWeight: 600 }}>{money(piece.price)}</div> : null}
                            {status ? <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 10px", borderRadius: 999, background: SAGE }}>{status}</div> : null}
                        </div>
                        <div style={{ height: 1, background: BRASS, opacity: 0.35, margin: "22px 0 6px" }} />
                        {facts.length ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 20 }}>
                                {facts.map(([k, v]) => (
                                    <div key={k} style={{ padding: "12px 0", borderBottom: `1px solid ${SAGE}` }}>
                                        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>{k}</div>
                                        <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        ) : piece.loading ? <div style={{ fontSize: 14, opacity: 0.5, padding: "12px 0" }}>Gathering the details</div> : null}
                        {piece.included ? (
                            <div style={{ padding: "14px 0 4px" }}>
                                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>What is included</div>
                                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{piece.included}</div>
                            </div>
                        ) : null}
                    </div>
                    <div style={{ padding: phone ? "12px 22px calc(16px + env(safe-area-inset-bottom))" : "16px 40px 36px", display: "flex", flexDirection: "column", gap: 10, borderTop: phone ? `1px solid ${SAGE}` : "0", background: SAND }}>
                        {isPiece && !piece.sold ? (
                            <div style={{ display: "flex", gap: 10 }}>
                                <button type="button" onClick={go} style={btn(true)}>Buy now</button>
                                {typeof window !== "undefined" && window.MintTray ? <button type="button" data-tray-add="" onClick={addToTray} style={btn(false)}>Add to tray</button> : null}
                            </div>
                        ) : !isPiece && !piece.sold ? (
                            <button type="button" onClick={go} style={btn(true)}>Check availability</button>
                        ) : null}
                        <button type="button" onClick={go} style={{ ...btn(false), flex: "0 0 auto", border: 0, background: "transparent", textDecoration: "underline", textUnderlineOffset: 4, minHeight: 40 }}>View full details</button>
                    </div>
                </div>
            </div>
        </div>
    )
    return createPortal(panel, document.body)
}
