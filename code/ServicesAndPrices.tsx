import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

// Service page: watch and jewelry price lists in one light section that carries on from the hero with a Watches | Jewelry switch,
// a symptom finder that highlights the services that fit, and the good to know points beneath.
// Rows use the same "Name | What it includes | From | Timeframe" lines as the old price tables.

const INK = "rgb(29, 29, 31)"
const INK2 = "rgba(29, 29, 31, 0.66)"
const INK3 = "rgba(29, 29, 31, 0.5)"
const CREAM = "#f4f2ec"
const BRASS = "#a56f18"
const TOP = "#ede4dd" // the service hero's ground, so the page continues without a seam
const FOOT = "rgb(238, 243, 234)" // the journey section below
const FONT = "'Bricolage Grotesque', sans-serif"

type Row = { name: string; what: string; from: string; time: string }
const parseRows = (s: string): Row[] =>
    (s || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ name: p[0], what: p[1] || "", from: p[2] || "", time: p[3] || "" }))
const parsePairs = (s: string) => (s || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ notice: p[0], service: p[1] || "" }))
const KEYS = ["Water", "Cleaning", "Authentication", "Refurbishment", "Movement", "Restoration"]
const matches = (rowName: string, rec: string) => KEYS.some((k) => rec.includes(k) && rowName.includes(k))

interface Props {
    eyebrow: string
    title: string
    note: string
    watchRows: string
    jewelryRows: string
    finderTitle: string
    symptoms: string
    goodTitle: string
    good: string
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function ServicesAndPrices(props: Props) {
    const { eyebrow = "Price list", title = "Services and prices", note = "", watchRows = "", jewelryRows = "", finderTitle = "Not sure what it needs?", symptoms = "", goodTitle = "Good to know", good = "", style } = props
    const [tab, setTab] = useState<"watch" | "jewelry">("watch")
    const [pick, setPick] = useState<number | null>(null)
    const watch = useMemo(() => parseRows(watchRows), [watchRows])
    const jewelry = useMemo(() => parseRows(jewelryRows), [jewelryRows])
    const pairs = useMemo(() => parsePairs(symptoms), [symptoms])
    const points = useMemo(() => (good || "").split("\n").map((x) => x.trim()).filter(Boolean), [good])
    const rows = tab === "watch" ? watch : jewelry
    const rec = tab === "watch" && pick != null && pairs[pick] ? pairs[pick].service : ""

    const switchTab = (t: "watch" | "jewelry") => { setTab(t); setPick(null) }

    // Phones: the symptom chips scroll sideways. Fades and an arrow show there is more, and the row nudges once on first view.
    const chips = useRef<HTMLDivElement>(null)
    const [edge, setEdge] = useState({ start: true, end: false, scrolls: false })
    useEffect(() => {
        const el = chips.current
        if (!el || typeof window === "undefined") return
        const read = () => setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4, scrolls: el.scrollWidth > el.clientWidth + 4 })
        read()
        el.addEventListener("scroll", read, { passive: true })
        window.addEventListener("resize", read)
        let io: IntersectionObserver | null = null
        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (!reduce && typeof IntersectionObserver !== "undefined") {
            io = new IntersectionObserver(([e]) => {
                if (!e.isIntersecting || el.scrollWidth <= el.clientWidth + 4) return
                io && io.disconnect()
                setTimeout(() => { el.scrollBy({ left: 72, behavior: "smooth" }); setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 650) }, 400)
            }, { threshold: 0.8 })
            io.observe(el)
        }
        return () => { el.removeEventListener("scroll", read); window.removeEventListener("resize", read); io && io.disconnect() }
    }, [tab, pairs.length])
    const more = () => { const el = chips.current; if (el) el.scrollBy({ left: Math.round(el.clientWidth * 0.7), behavior: "smooth" }) }

    return (
        <section style={{ width: "100%", background: `linear-gradient(180deg, ${TOP} 0%, ${TOP} 30%, ${FOOT} 100%)`, color: INK, fontFamily: FONT, boxSizing: "border-box", ["--sp-here" as any]: "#ede8e1", ...style }} className="sp-root">
            <style>{`
.sp-wrap{max-width:1100px;margin:0 auto;padding:clamp(56px,8vw,112px) clamp(20px,5vw,56px) clamp(72px,9vw,120px)}
.sp-head{display:flex;justify-content:space-between;align-items:flex-end;gap:28px;flex-wrap:wrap}
.sp-glass{background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75);box-shadow:0 18px 40px -30px rgba(60,48,36,.35),inset 0 1px 0 rgba(255,255,255,.6)}
.sp-tabs{display:inline-flex;padding:5px;border-radius:999px}
.sp-tab{appearance:none;border:0;cursor:pointer;font-family:${FONT};font-size:14px;font-weight:500;padding:11px 22px;border-radius:999px;color:${INK2};background:transparent;transition:background-color 320ms cubic-bezier(.22,1,.36,1),color 320ms ease}
.sp-tab.on{background:${INK};color:${CREAM}}
.sp-tab:focus-visible,.sp-chip:focus-visible{outline:1px solid ${BRASS};outline-offset:3px}
.sp-finder{margin-top:40px;display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.sp-flabel{font-size:14px;color:${INK2};margin-right:6px}
.sp-chips-wrap{position:relative;display:contents}
.sp-chips{display:contents}
.sp-more{display:none}
.sp-chip{appearance:none;cursor:pointer;font-family:${FONT};font-size:13.5px;padding:9px 16px;border-radius:999px;color:${INK};transition:background-color 240ms ease,color 240ms ease,border-color 240ms ease}
.sp-chip:hover{background:rgba(255,255,255,.8)}
.sp-chip.on{background:${INK};border-color:${INK};color:${CREAM}}
.sp-list{margin-top:32px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.sp-row{position:relative;display:flex;flex-direction:column;gap:10px;padding:26px 28px;border-radius:22px;transition:opacity 300ms ease,box-shadow 300ms ease,transform 300ms ease}
.sp-dim .sp-row{opacity:.45}
.sp-dim .sp-row.hit{opacity:1;box-shadow:0 0 0 1.5px ${BRASS},0 22px 44px -28px rgba(60,48,36,.45)}
.sp-top{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.sp-name{font-size:19px;font-weight:500;letter-spacing:-.01em;line-height:1.3;color:${INK}}
.sp-tag{display:block;margin-top:4px;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${BRASS}}
.sp-what{font-size:14.5px;line-height:1.6;color:${INK2}}
.sp-from{font-size:16px;font-weight:500;color:${INK};white-space:nowrap;font-variant-numeric:tabular-nums}
.sp-from.free{color:${BRASS}}
.sp-time{display:inline-flex;align-items:center;gap:7px;margin-top:auto;padding-top:4px;font-size:13px;color:${INK3}}
.sp-goodbox{margin-top:56px;padding:34px 36px;border-radius:26px}
.sp-good{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px;margin-top:22px}
.sp-pt{font-size:14.5px;line-height:1.6;color:${INK2}}
.sp-pt b{display:block;font-size:11px;font-weight:600;letter-spacing:.2em;color:${BRASS};margin-bottom:8px}
@media (max-width:809px){
 .sp-list{grid-template-columns:1fr;gap:12px}
 .sp-row{padding:22px 22px;border-radius:20px}
 .sp-name{font-size:17px}
 .sp-goodbox{margin-top:40px;padding:26px 22px;border-radius:22px}
 .sp-good{grid-template-columns:1fr;gap:22px;margin-top:18px}
 .sp-finder{margin-top:30px;display:block}
 .sp-flabel{display:block;margin:0 0 12px}
 .sp-chips-wrap{display:block;position:relative;margin:0 -20px}
 .sp-chips{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding:2px 20px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}
 .sp-chips::-webkit-scrollbar{display:none}
 .sp-chips>*{flex:0 0 auto;scroll-snap-align:start}
 .sp-chips-wrap::before,.sp-chips-wrap::after{content:"";position:absolute;top:0;bottom:8px;width:48px;pointer-events:none;opacity:0;transition:opacity 220ms ease;z-index:1}
 .sp-chips-wrap::before{left:0;background:linear-gradient(90deg,var(--sp-here),transparent)}
 .sp-chips-wrap::after{right:0;width:84px;background:linear-gradient(270deg,var(--sp-here) 40%,transparent)}
 .sp-chips-wrap.fade-l::before,.sp-chips-wrap.fade-r::after{opacity:1}
 .sp-more{display:grid;place-items:center;position:absolute;right:14px;top:50%;margin-top:-21px;width:34px;height:34px;border-radius:50%;background:${INK};color:${CREAM};border:0;cursor:pointer;z-index:2;padding:0;-webkit-tap-highlight-color:transparent}
}
`}</style>
            <div className="sp-wrap">
                <div className="sp-head">
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: BRASS }}>
                            {eyebrow}
                        </span>
                        <h2 style={{ margin: 0, fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: 1.08, fontWeight: 400, letterSpacing: "-0.02em" }}>{title}</h2>
                        {note ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: INK2 }}>{note}</p> : null}
                    </div>
                    <div className="sp-tabs sp-glass" role="tablist" aria-label="Service type">
                        <button type="button" role="tab" aria-selected={tab === "watch"} className={"sp-tab" + (tab === "watch" ? " on" : "")} onClick={() => switchTab("watch")}>Watches</button>
                        <button type="button" role="tab" aria-selected={tab === "jewelry"} className={"sp-tab" + (tab === "jewelry" ? " on" : "")} onClick={() => switchTab("jewelry")}>Jewelry</button>
                    </div>
                </div>

                {tab === "watch" && pairs.length ? (
                    <div className="sp-finder" aria-label={finderTitle}>
                        <span className="sp-flabel">{finderTitle}</span>
                        <div className={"sp-chips-wrap" + (edge.scrolls && !edge.start ? " fade-l" : "") + (edge.scrolls && !edge.end ? " fade-r" : "")}>
                            <div className="sp-chips" ref={chips}>
                                {pairs.map((p, i) => (
                                    <button key={p.notice} type="button" aria-pressed={pick === i} className={"sp-chip sp-glass" + (pick === i ? " on" : "")} onClick={() => setPick(pick === i ? null : i)}>{p.notice}</button>
                                ))}
                            </div>
                            {edge.scrolls && !edge.end ? (
                                <button type="button" className="sp-more" aria-label="More symptoms" onClick={more}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className={"sp-list" + (rec ? " sp-dim" : "")} role="tabpanel">
                    {rows.map((r) => {
                        const hit = !!rec && matches(r.name, rec)
                        const free = /complimentary/i.test(r.from)
                        return (
                            <div key={r.name} className={"sp-row sp-glass" + (hit ? " hit" : "")}>
                                <div className="sp-top">
                                    <div className="sp-name">{r.name}{hit ? <span className="sp-tag">Recommended</span> : null}</div>
                                    <div className={"sp-from" + (free ? " free" : "")}>{r.from}</div>
                                </div>
                                <div className="sp-what">{r.what}</div>
                                {r.time ? (
                                    <div className="sp-time">
                                        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                                        {r.time}
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>

                {points.length ? (
                    <div className="sp-goodbox sp-glass">
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>{goodTitle}</h3>
                        <div className="sp-good">
                            {points.map((p, i) => (
                                <div key={i} className="sp-pt"><b>{String(i + 1).padStart(2, "0")}</b>{p}</div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    )
}

addPropertyControls(ServicesAndPrices, {
    eyebrow: { type: ControlType.String, title: "Label", defaultValue: "Price list" },
    title: { type: ControlType.String, title: "Heading", defaultValue: "Services and prices" },
    note: { type: ControlType.String, title: "Note", displayTextArea: true, defaultValue: "" },
    watchRows: { type: ControlType.String, title: "Watch rows", displayTextArea: true, defaultValue: "" },
    jewelryRows: { type: ControlType.String, title: "Jewelry rows", displayTextArea: true, defaultValue: "" },
    finderTitle: { type: ControlType.String, title: "Finder label", defaultValue: "Not sure what it needs?" },
    symptoms: { type: ControlType.String, title: "Symptoms", displayTextArea: true, defaultValue: "" },
    goodTitle: { type: ControlType.String, title: "Points label", defaultValue: "Good to know" },
    good: { type: ControlType.String, title: "Points", displayTextArea: true, defaultValue: "" },
})
