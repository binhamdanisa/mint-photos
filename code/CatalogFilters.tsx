import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Catalog filters. Every product card carries an invisible FilterTag that reports its live CMS
// values. The FilterBar reads those reports for options and counts, so the numbers always match
// what is actually on the page, and hides or reorders the cards instantly with no reload.
// There is deliberately no availability filter: listings stay listed.

const INK = "#1d1d1f"
const SUB = "rgb(49, 54, 48)"
const GOLD = "#a56f18"
const FONT = "'Bricolage Grotesque', sans-serif"
const LIST_NAME = "Product List"

type Item = { key: string; el: HTMLElement | null; idx: number; brand: string; price: number; year: string; yearNum: number | null; condition: string; caseSize: string; material: string; movement: string; category: string }
type State = { brand: string[]; condition: string[]; year: string[]; caseSize: string[]; material: string[]; movement: string[]; category: string[]; price: string; min: string; max: string; sort: string }
const EMPTY: State = { brand: [], condition: [], year: [], caseSize: [], material: [], movement: [], category: [], price: "", min: "", max: "", sort: "featured" }

// ---- shared store (module level, shared by every FilterTag and the FilterBar on the page)
const items = new Map<string, Item>()
let state: State = EMPTY
let version = 0
const subs = new Set<() => void>()
const emit = () => { version++; subs.forEach((f) => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const getVersion = () => version
let seq = 0
let pending = false
const schedule = () => { if (pending) return; pending = true; Promise.resolve().then(() => { pending = false; emit() }) }

const norm = (s: any) => String(s ?? "").trim()
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bNew\b/g, "new").replace(/^Like new$/i, "Like new")
const hasPapers = (inc: string) => /paper|certificat/i.test(inc || "")
function yearLabel(year: string, included: string) { const y = norm(year); return y ? y : hasPapers(included) ? "Undated" : "" }
function yearNum(label: string) { const m = label.match(/(1[89]\d\d|20\d\d)/); return m ? Number(m[1]) : null }
function decade(label: string) { if (!label) return ""; if (label === "Undated") return "Undated"; const n = yearNum(label); if (n == null) return "Other"; if (n >= 2020) return "2020s"; if (n >= 2010) return "2010s"; if (n >= 2000) return "2000s"; if (n >= 1990) return "1990s"; return "Before 1990" }
const PRICES = [
    { id: "u10", label: "Under $10,000", lo: 0, hi: 10000 },
    { id: "10-25", label: "$10,000 to $25,000", lo: 10000, hi: 25000 },
    { id: "25-50", label: "$25,000 to $50,000", lo: 25000, hi: 50000 },
    { id: "50-100", label: "$50,000 to $100,000", lo: 50000, hi: 100000 },
    { id: "o100", label: "Over $100,000", lo: 100000, hi: Infinity },
]
const SORTS = [
    { id: "featured", label: "Featured" },
    { id: "price-asc", label: "Price low to high" },
    { id: "price-desc", label: "Price high to low" },
    { id: "year-new", label: "Year newest" },
    { id: "year-old", label: "Year oldest" },
]
const GROUPS: { key: keyof State; label: string; get: (i: Item) => string }[] = [
    { key: "brand", label: "Brand", get: (i) => i.brand },
    { key: "condition", label: "Condition", get: (i) => titleCase(i.condition.toLowerCase()) },
    { key: "year", label: "Year", get: (i) => decade(i.year) },
    { key: "caseSize", label: "Case size", get: (i) => i.caseSize },
    { key: "material", label: "Material", get: (i) => i.material },
    { key: "movement", label: "Movement", get: (i) => titleCase(i.movement.toLowerCase()) },
    { key: "category", label: "Category", get: (i) => (/^accessor/i.test(i.category) ? "Accessories" : "Watches") },
]

function priceOk(i: Item, s: State) {
    const p = i.price || 0
    if (s.price) { const r = PRICES.find((x) => x.id === s.price); if (r && !(p >= r.lo && p < r.hi)) return false }
    const lo = Number(s.min) || 0, hi = Number(s.max) || 0
    if (lo && p < lo) return false
    if (hi && p > hi) return false
    return true
}
function matches(i: Item, s: State, skip?: keyof State) {
    for (const g of GROUPS) {
        if (g.key === skip) continue
        const sel = s[g.key] as string[]
        if (sel.length && !sel.includes(g.get(i))) return false
    }
    if (skip !== "price" && !priceOk(i, s)) return false
    return true
}
function activeCount(s: State) { return GROUPS.reduce((n, g) => n + (s[g.key] as string[]).length, 0) + (s.price ? 1 : 0) + (s.min || s.max ? 1 : 0) }

function apply() {
    const list = [...items.values()]
    const sorted = [...list].sort((a, b) => {
        switch (state.sort) {
            case "price-asc": return (a.price || 0) - (b.price || 0) || a.idx - b.idx
            case "price-desc": return (b.price || 0) - (a.price || 0) || a.idx - b.idx
            case "year-new": return (b.yearNum ?? -1) - (a.yearNum ?? -1) || a.idx - b.idx
            case "year-old": return (a.yearNum ?? 99999) - (b.yearNum ?? 99999) || a.idx - b.idx
            default: return a.idx - b.idx
        }
    })
    sorted.forEach((it, n) => { if (!it.el) return; it.el.style.display = matches(it, state) ? "" : "none"; it.el.style.order = String(n) })
}

function setState(next: State, persist = true) {
    state = next
    apply()
    if (persist && typeof window !== "undefined") {
        try {
            const enc = btoa(unescape(encodeURIComponent(JSON.stringify(next))))
            const url = new URL(window.location.href)
            if (activeCount(next) || next.sort !== "featured") url.searchParams.set("f", enc); else url.searchParams.delete("f")
            window.history.replaceState(window.history.state, "", url.toString())
            sessionStorage.setItem("mint-filters:" + window.location.pathname, enc)
        } catch (e) {}
    }
    emit()
}
function readSaved(): State | null {
    if (typeof window === "undefined") return null
    try {
        const q = new URL(window.location.href).searchParams.get("f") || sessionStorage.getItem("mint-filters:" + window.location.pathname)
        if (!q) return null
        return { ...EMPTY, ...JSON.parse(decodeURIComponent(escape(atob(q)))) }
    } catch (e) { return null }
}

// ---- FilterTag: lives inside each product card, renders nothing visible
interface TagProps { brand: string; price: number; year: string; included: string; condition: string; caseSize: string; material: string; movement: string; category: string; style?: CSSProperties }

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function FilterTag(props: TagProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const key = useRef("t" + seq++).current
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        let el: HTMLElement | null = ref.current
        while (el && el.parentElement && el.parentElement.getAttribute("data-framer-name") !== LIST_NAME) el = el.parentElement
        if (!el || !el.parentElement) return
        const siblings = Array.from(el.parentElement.children)
        const label = yearLabel(props.year, props.included)
        items.set(key, { key, el, idx: siblings.indexOf(el), brand: norm(props.brand), price: Number(props.price) || 0, year: label, yearNum: yearNum(label), condition: norm(props.condition), caseSize: norm(props.caseSize), material: norm(props.material), movement: norm(props.movement), category: norm(props.category) })
        el.style.display = matches(items.get(key)!, state) ? "" : "none"
        schedule()
        return () => { items.delete(key); schedule() }
    }, [props.brand, props.price, props.year, props.included, props.condition, props.caseSize, props.material, props.movement, props.category])
    return <span ref={ref} aria-hidden="true" style={{ display: "block", width: 0, height: 0, overflow: "hidden", position: "absolute", ...props.style }} />
}
addPropertyControls(FilterTag, {
    brand: { type: ControlType.String, title: "Brand" },
    price: { type: ControlType.Number, title: "Price" },
    year: { type: ControlType.String, title: "Year" },
    included: { type: ControlType.String, title: "Included" },
    condition: { type: ControlType.String, title: "Condition" },
    caseSize: { type: ControlType.String, title: "Case size" },
    material: { type: ControlType.String, title: "Material" },
    movement: { type: ControlType.String, title: "Movement" },
    category: { type: ControlType.String, title: "Category" },
})

// ---- FilterBar
function Check({ on }: { on: boolean }) {
    return (
        <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: "1px solid " + (on ? INK : "rgba(29,29,31,0.28)"), background: on ? INK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 160ms" }}>
            {on ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
        </span>
    )
}

interface BarProps { sourcingLink: string; showCategory: boolean; style?: CSSProperties }

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function FilterBar(props: BarProps) {
    const { sourcingLink = "/buy", showCategory = true, style } = props
    useSyncExternalStore(subscribe, getVersion, getVersion)
    const box = useRef<HTMLDivElement>(null)
    const [w, setW] = useState(1200)
    const [open, setOpen] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas
    useEffect(() => {
        const el = box.current
        if (el && typeof ResizeObserver !== "undefined") { const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect() }
    }, [])
    useEffect(() => { const saved = readSaved(); if (saved) setState(saved, false) }, [])
    useEffect(() => {
        if (typeof document === "undefined" || canvas) return
        const phone = w < 700
        document.body.style.overflow = open && phone ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [open, w])
    const phone = w < 700
    const list = [...items.values()]
    const total = list.filter((i) => matches(i, state)).length
    const cats = new Set(list.map((i) => GROUPS[6].get(i)))
    const groups = GROUPS.filter((g) => g.key !== "category" || (showCategory && cats.size > 1))
    const options = useMemo(() => {
        const out: Record<string, { v: string; n: number }[]> = {}
        for (const g of groups) {
            const counts = new Map<string, number>()
            for (const i of list) { const v = g.get(i); if (!v) continue; if (!counts.has(v)) counts.set(v, 0); if (matches(i, state, g.key)) counts.set(v, counts.get(v)! + 1) }
            let arr = [...counts.entries()].map(([v, n]) => ({ v, n }))
            if (g.key === "year") { const order = ["2020s", "2010s", "2000s", "1990s", "Before 1990", "Other", "Undated"]; arr.sort((a, b) => order.indexOf(a.v) - order.indexOf(b.v)) }
            else if (g.key === "caseSize") arr.sort((a, b) => (parseFloat(a.v) || 0) - (parseFloat(b.v) || 0))
            else arr.sort((a, b) => b.n - a.n || a.v.localeCompare(b.v))
            out[g.key] = arr
        }
        return out
    }, [version, groups.length])
    const priceCounts = PRICES.map((r) => ({ ...r, n: list.filter((i) => matches(i, { ...state, price: r.id })).length }))
    const toggle = (k: keyof State, v: string) => { const cur = state[k] as string[]; setState({ ...state, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }) }
    const clear = () => setState({ ...EMPTY, sort: state.sort })
    const chips: { label: string; remove: () => void }[] = []
    for (const g of groups) for (const v of state[g.key] as string[]) chips.push({ label: v, remove: () => toggle(g.key, v) })
    if (state.price) chips.push({ label: PRICES.find((p) => p.id === state.price)?.label || "Price", remove: () => setState({ ...state, price: "" }) })
    if (state.min || state.max) chips.push({ label: (state.min ? "$" + Number(state.min).toLocaleString("en-US") : "$0") + " to " + (state.max ? "$" + Number(state.max).toLocaleString("en-US") : "any"), remove: () => setState({ ...state, min: "", max: "" }) })
    const n = activeCount(state)
    const pieces = (c: number) => c + (c === 1 ? " piece" : " pieces")

    const glass: CSSProperties = { background: "linear-gradient(180deg, rgba(220,228,215,0.82), rgba(212,220,207,0.72))", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 16px 36px -20px rgba(29,29,31,0.35)" }
    const pill = (active: boolean): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 999, border: active ? "1px solid " + INK : "1px solid rgba(29,29,31,0.14)", background: active ? INK : "rgba(255,255,255,0.75)", color: active ? "#fff" : INK, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" })
    const label: CSSProperties = { fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUB }

    const renderGroups = () => (
        <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : w < 1000 ? "1fr 1fr" : "repeat(3, 1fr)", gap: phone ? 0 : 28 }}>
            <section style={{ padding: phone ? "18px 0" : 0, borderBottom: phone ? "1px solid rgba(29,29,31,0.08)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={label}>Price</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {priceCounts.map((r) => <button key={r.id} type="button" disabled={!r.n && state.price !== r.id} onClick={() => setState({ ...state, price: state.price === r.id ? "" : r.id })} style={{ ...pill(state.price === r.id), opacity: !r.n && state.price !== r.id ? 0.4 : 1 }}>{r.label}<span style={{ opacity: 0.6, fontWeight: 500 }}>{r.n}</span></button>)}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {(["min", "max"] as const).map((k) => (
                        <input key={k} inputMode="numeric" placeholder={k === "min" ? "Min $" : "Max $"} value={state[k]} onChange={(e) => setState({ ...state, [k]: e.target.value.replace(/[^0-9]/g, "") })} style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(29,29,31,0.14)", background: "#fff", fontFamily: FONT, fontSize: 15, color: INK }} />
                    ))}
                </div>
            </section>
            {groups.map((g) => {
                const opts = options[g.key] || []
                if (!opts.length) return null
                const asChips = g.key === "year" || g.key === "caseSize" || g.key === "category" || g.key === "movement"
                return (
                    <section key={g.key} style={{ padding: phone ? "18px 0" : 0, borderBottom: phone ? "1px solid rgba(29,29,31,0.08)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={label}>{g.label}</div>
                        {asChips ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {opts.map((o) => { const on = (state[g.key] as string[]).includes(o.v); return <button key={o.v} type="button" disabled={!o.n && !on} onClick={() => toggle(g.key, o.v)} style={{ ...pill(on), opacity: !o.n && !on ? 0.4 : 1 }}>{o.v}<span style={{ opacity: 0.6, fontWeight: 500 }}>{o.n}</span></button> })}
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: phone ? "none" : 220, overflowY: phone ? "visible" : "auto" }}>
                                {opts.map((o) => { const on = (state[g.key] as string[]).includes(o.v); return (
                                    <button key={o.v} type="button" disabled={!o.n && !on} onClick={() => toggle(g.key, o.v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: phone ? "12px 2px" : "8px 2px", border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 15, color: INK, opacity: !o.n && !on ? 0.4 : 1, textAlign: "left" }}>
                                        <Check on={on} /><span style={{ flex: 1 }}>{o.v}</span><span style={{ fontSize: 13, color: "rgba(29,29,31,0.5)" }}>{o.n}</span>
                                    </button>) })}
                            </div>
                        )}
                    </section>
                )
            })}
        </div>
    )

    return (
        <div ref={box} style={{ width: "100%", fontFamily: FONT, color: INK, display: "flex", flexDirection: "column", gap: 12, ...style }}>
            <div style={{ ...glass, borderRadius: phone ? 20 : 999, padding: phone ? "8px" : "8px 8px 8px 10px", display: "flex", alignItems: "center", gap: 8, flexWrap: phone ? "wrap" : "nowrap" }}>
                <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} style={{ ...pill(open), padding: "10px 16px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" fill="none" stroke={open ? "#fff" : INK} strokeWidth="1.4" strokeLinecap="round" /><circle cx="16" cy="7" r="2" fill="none" stroke={open ? "#fff" : INK} strokeWidth="1.4" /><circle cx="10" cy="17" r="2" fill="none" stroke={open ? "#fff" : INK} strokeWidth="1.4" /></svg>
                    Filters{n ? <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: open ? "#fff" : GOLD, color: open ? INK : "#fff", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{n}</span> : null}
                </button>
                <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", order: phone ? 3 : 0, flexBasis: phone ? "100%" : "auto" }}>
                    {chips.map((c) => (
                        <button key={c.label} type="button" onClick={c.remove} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 12px", borderRadius: 999, border: 0, background: "rgba(255,255,255,0.85)", color: INK, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }} aria-label={"Remove " + c.label}>
                            {c.label}<svg width="10" height="10" viewBox="0 0 12 12"><path d="m3 3 6 6M9 3 3 9" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /></svg>
                        </button>
                    ))}
                    {chips.length ? <button type="button" onClick={clear} style={{ padding: "7px 10px", border: 0, background: "transparent", color: SUB, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap" }}>Clear all</button> : null}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: SUB, whiteSpace: "nowrap", padding: "0 6px", marginLeft: phone ? "auto" : 0 }}>{canvas ? "Live count" : pieces(total)}</span>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Sort</span>
                    <select value={state.sort} onChange={(e) => setState({ ...state, sort: e.target.value })} style={{ appearance: "none", WebkitAppearance: "none", padding: "10px 34px 10px 14px", borderRadius: 999, border: "1px solid rgba(29,29,31,0.14)", background: "rgba(255,255,255,0.75)", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: INK, cursor: "pointer" }}>
                        {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: "absolute", right: 14, pointerEvents: "none" }}><path d="m3 4.5 3 3 3-3" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /></svg>
                </label>
            </div>

            {open && !phone ? (
                <div style={{ ...glass, background: "rgba(245,245,247,0.94)", borderRadius: 24, padding: 26 }}>
                    {renderGroups()}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                        <button type="button" onClick={clear} style={{ ...pill(false) }}>Clear all</button>
                        <button type="button" onClick={() => setOpen(false)} style={{ ...pill(true) }}>Show {pieces(total)}</button>
                    </div>
                </div>
            ) : null}

            {open && phone ? (
                <div role="dialog" aria-modal="true" aria-label="Filters" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(245,245,247,0.86)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 10px" }}>
                        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Filters</span>
                        <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: "rgba(29,29,31,0.06)", fontSize: 20, color: INK, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>{renderGroups()}</div>
                    <div style={{ display: "flex", gap: 10, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(29,29,31,0.08)", background: "rgba(245,245,247,0.96)" }}>
                        <button type="button" onClick={clear} style={{ ...pill(false), flex: "0 0 auto", padding: "15px 18px", fontSize: 15 }}>Clear all</button>
                        <button type="button" onClick={() => setOpen(false)} style={{ ...pill(true), flex: 1, justifyContent: "center", padding: "15px 18px", fontSize: 15 }}>Show {pieces(total)}</button>
                    </div>
                </div>
            ) : null}

            {!canvas && list.length > 0 && total === 0 ? (
                <div style={{ borderRadius: 24, background: "#fff", padding: phone ? 26 : 40, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, border: "1px solid rgba(29,29,31,0.06)" }}>
                    <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>No pieces match those filters yet.</span>
                    <span style={{ fontSize: 16, lineHeight: 1.6, color: "var(--token-5befc44e-9d08-4683-96c0-ff439142bf85, rgba(49,54,48,0.75))" }}>New pieces arrive weekly, and we source on request.</span>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <a href={sourcingLink} style={{ ...pill(true), textDecoration: "none", padding: "13px 20px" }}>Source a watch for me</a>
                        <button type="button" onClick={clear} style={{ ...pill(false), padding: "13px 20px" }}>Clear all</button>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

addPropertyControls(FilterBar, {
    sourcingLink: { type: ControlType.Link, title: "Sourcing link", defaultValue: "/buy" },
    showCategory: { type: ControlType.Boolean, title: "Category group", defaultValue: true },
})
