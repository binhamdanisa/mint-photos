import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Service hero: a living watch movement drawn in fine line on black. The gear train turns, the balance wheel
// swings, and a watchmaker's loupe follows the pointer (or drifts on its own on touch screens), revealing the
// movement magnified in brass. Credentials sit beneath as stamped hallmarks.
// Reduced motion and the Framer canvas show the movement at rest with the loupe parked.

const CREAM = "#f4f2ec"
const BRASS = "#d4b278"
const FONT = "'Bricolage Grotesque', sans-serif"

interface Props {
    eyebrow: string
    title: string
    line: string
    marks: string
    marksNote: string
    cta: string
    ctaLink: string
    track: string
    style?: CSSProperties
}

const CSS = `
@keyframes svSpin{to{transform:rotate(360deg)}}
@keyframes svSpinR{to{transform:rotate(-360deg)}}
@keyframes svSwing{0%{transform:rotate(-150deg)}50%{transform:rotate(150deg)}100%{transform:rotate(-150deg)}}
@keyframes svTick{to{transform:rotate(360deg)}}
@keyframes svUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.sv-g{transform-box:fill-box;transform-origin:50% 50%}
.sv-in{opacity:0;animation:svUp 1.2s cubic-bezier(.22,1,.36,1) forwards}
.sv-arrow{display:inline-flex;align-items:center;gap:8px;transition:gap 250ms ease}
.sv-act:hover .sv-arrow{gap:12px}
.sv-act2:hover{color:#f4f2ec!important}
.sv-cta:focus-visible,.sv-link:focus-visible{outline:1px solid ${BRASS};outline-offset:4px}
.sv-link:hover span{border-bottom-color:${CREAM}!important}
.sv-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);align-items:center;gap:clamp(24px,4vw,64px);min-height:min(92svh,920px);padding:clamp(120px,14svh,150px) 5vw clamp(48px,7svh,80px);box-sizing:border-box}
.sv-art{position:relative;width:min(100%,640px);aspect-ratio:1;justify-self:center}
@media (max-width:900px){.sv-wrap{grid-template-columns:1fr;gap:8px;padding:104px 20px 44px;min-height:0}.sv-art{width:min(92vw,460px);order:-1;margin-bottom:-12px}}
`

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

// A gear outline: n teeth on a pitch radius r.
function gearPath(cx: number, cy: number, r: number, n: number, depth = 0.08) {
    const ro = r * (1 + depth / 2), ri = r * (1 - depth / 2)
    const pts: string[] = []
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const step = (Math.PI * 2) / n
        const seq = [[ri, a0], [ro, a0 + step * 0.18], [ro, a0 + step * 0.5], [ri, a0 + step * 0.68]]
        for (const [rr, a] of seq) pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`)
    }
    return "M" + pts.join("L") + "Z"
}
function spokes(cx: number, cy: number, r: number, k: number) {
    let d = ""
    for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2; d += `M${cx},${cy}L${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}` }
    return d
}
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number) {
    let d = ""
    const steps = Math.round(turns * 48)
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, a = t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t
        d += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2)
    }
    return d
}

function Movement({ still, stroke, width }: { still: boolean; stroke: string; width: number }) {
    const s = { fill: "none", stroke, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    const anim = (name: string, dur: number, extra = ""): CSSProperties => (still ? {} : { animation: `${name} ${dur}s ${extra || "linear"} infinite` })
    const g = useMemo(() => ({
        barrel: gearPath(300, 330, 118, 96, 0.05), center: gearPath(468, 228, 64, 64), third: gearPath(388, 120, 46, 54), fourth: gearPath(250, 150, 40, 48),
        escape: gearPath(214, 450, 30, 15, 0.32), crown: gearPath(118, 300, 26, 28),
        hair: spiral(410, 440, 6, 46, 9),
    }), [])
    return (
        <g>
            {/* main plate and bridges */}
            <circle cx="300" cy="300" r="286" {...s} />
            <circle cx="300" cy="300" r="270" {...s} strokeDasharray="1 7" />
            <path d="M120 230 C 180 170 300 150 380 170 L 430 200 C 450 215 455 240 440 258 L 330 300 C 250 330 160 320 130 290 Z" {...s} />
            <path d="M340 380 C 380 360 470 380 500 420 C 520 450 500 500 460 515 L 380 520 C 340 515 320 470 330 430 Z" {...s} />
            {/* screws and jewels */}
            {[[150, 260], [418, 228], [360, 500], [480, 470], [240, 205], [196, 470], [520, 300], [300, 560]].map(([x, y], i) => (
                <g key={i}><circle cx={x} cy={y} r="9" {...s} /><path d={`M${x - 6},${y}L${x + 6},${y}`} {...s} /></g>
            ))}
            {[[468, 228], [388, 120], [250, 150], [214, 450], [410, 440]].map(([x, y], i) => <circle key={"j" + i} cx={x} cy={y} r="5" {...s} />)}
            {/* gear train */}
            <g className="sv-g" style={anim("svSpinR", 240)}><path d={g.barrel} {...s} /><circle cx="300" cy="330" r="96" {...s} /><path d={spokes(300, 330, 96, 5)} {...s} /><circle cx="300" cy="330" r="22" {...s} /></g>
            <g className="sv-g" style={anim("svSpin", 90)}><path d={g.center} {...s} /><path d={spokes(468, 228, 54, 4)} {...s} /><circle cx="468" cy="228" r="54" {...s} /></g>
            <g className="sv-g" style={anim("svSpinR", 40)}><path d={g.third} {...s} /><path d={spokes(388, 120, 38, 4)} {...s} /><circle cx="388" cy="120" r="38" {...s} /></g>
            <g className="sv-g" style={anim("svSpin", 20)}><path d={g.fourth} {...s} /><path d={spokes(250, 150, 32, 5)} {...s} /><circle cx="250" cy="150" r="32" {...s} /></g>
            <g className="sv-g" style={anim("svTick", 7.5, "steps(15)")}><path d={g.escape} {...s} /><circle cx="214" cy="450" r="12" {...s} /></g>
            <g className="sv-g" style={anim("svSpin", 60)}><path d={g.crown} {...s} /><circle cx="118" cy="300" r="10" {...s} /></g>
            {/* pallet fork */}
            <path d="M232 438 L 330 430 M 300 418 L 330 430 L 300 444" {...s} />
            {/* balance wheel and hairspring */}
            <path d={g.hair} {...s} />
            <g className="sv-g" style={anim("svSwing", 1.6, "cubic-bezier(.45,0,.55,1)")}>
                <circle cx="410" cy="440" r="64" {...s} /><circle cx="410" cy="440" r="58" {...s} />
                <path d={spokes(410, 440, 58, 3)} {...s} />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return <circle key={i} cx={410 + 64 * Math.cos(a)} cy={440 + 64 * Math.sin(a)} r="3.2" {...s} /> })}
            </g>
            <circle cx="410" cy="440" r="8" {...s} />
        </g>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function ServiceHero(props: Props) {
    const {
        eyebrow = "Watches and fine jewelry",
        title = "Service and Repair",
        line = "Your piece, in certified hands.",
        marks = "CMW21, WOSTEP, CMBJ",
        marksNote = "Watch work by CMW21 and WOSTEP certified watchmakers. Jewelry work by CMBJ certified bench jewelers.",
        cta = "Request service",
        ctaLink = "/service#request-service",
        track = "Track a repair",
        style,
    } = props
    const svg = useRef<SVGSVGElement>(null)
    const [lp, setLp] = useState({ x: 330, y: 300 })
    const [reduce, setReduce] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const still = reduce || canvas
    const user = useRef(false)

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        const read = () => setReduce(mq.matches)
        read()
        mq.addEventListener ? mq.addEventListener("change", read) : (mq as any).addListener(read)
        return () => { mq.removeEventListener ? mq.removeEventListener("change", read) : (mq as any).removeListener(read) }
    }, [])

    // The loupe drifts slowly over the movement until the visitor takes it.
    useEffect(() => {
        if (still) return
        let raf = 0, t0 = performance.now(), idle = 0
        const tick = (t: number) => {
            if (!user.current || t - idle > 3500) {
                user.current = false
                const k = (t - t0) / 1000
                setLp({ x: 300 + 150 * Math.sin(k * 0.23), y: 300 + 120 * Math.sin(k * 0.31 + 1.2) })
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        const el = svg.current
        const move = (e: PointerEvent) => {
            if (!el) return
            const r = el.getBoundingClientRect()
            const x = ((e.clientX - r.left) / r.width) * 600, y = ((e.clientY - r.top) / r.height) * 600
            if (x < -40 || x > 640 || y < -40 || y > 640) return
            user.current = true; idle = performance.now()
            setLp({ x: clamp(x, 40, 560), y: clamp(y, 40, 560) })
        }
        window.addEventListener("pointermove", move, { passive: true })
        return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move) }
    }, [still])

    const R = 92, Z = 2.1
    const toTrack = () => {
        if (typeof document === "undefined") return
        const el = document.querySelector('[data-framer-name="Track Your Service"]') as HTMLElement | null
        if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    }
    const anim = (d: number): CSSProperties => (still ? {} : { animationDelay: d + "ms" })
    const inCls = still ? "" : "sv-in"
    const list = marks.split(",").map((m) => m.trim()).filter(Boolean)

    return (
        <section style={{ position: "relative", width: "100%", background: "radial-gradient(120% 90% at 78% 40%, #1a1712 0%, #0b0b0a 55%, #000 100%)", color: CREAM, fontFamily: FONT, overflow: "hidden", ...style }}>
            <style>{CSS}</style>
            <div className="sv-wrap">
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420, position: "relative", zIndex: 2 }}>
                    <span className={inCls} style={{ ...anim(100), display: "inline-flex", alignItems: "center", gap: 12, fontSize: 10, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: BRASS }}>
                        <span style={{ width: 26, height: 1, background: BRASS, opacity: 0.7 }} />{eyebrow}
                    </span>
                    <h1 className={inCls} style={{ ...anim(220), margin: 0, fontSize: "clamp(28px, 2.6vw, 38px)", lineHeight: 1.1, fontWeight: 400, letterSpacing: "-0.02em" }}>{title}</h1>
                    <p className={inCls} style={{ ...anim(340), margin: 0, fontSize: "clamp(16px, 1.3vw, 19px)", lineHeight: 1.4, fontWeight: 400, color: "rgba(244,242,236,0.8)" }}>{line}</p>
                    <div className={inCls} style={{ ...anim(460), display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 22px", marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(244,242,236,0.12)" }}>
                        <a className="sv-act" href={ctaLink} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: CREAM, textDecoration: "none", minHeight: 36, display: "inline-flex", alignItems: "center" }}><span className="sv-arrow">{cta}<span aria-hidden="true">→</span></span></a>
                        <button type="button" className="sv-act sv-act2" onClick={toTrack} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,242,236,0.7)", background: "none", border: 0, padding: 0, minHeight: 36, cursor: "pointer", transition: "color 200ms ease" }}><span className="sv-arrow">{track}<span aria-hidden="true">→</span></span></button>
                    </div>
                    <div className={inCls} style={{ ...anim(600), display: "flex", flexDirection: "column", gap: 10, paddingTop: 18, marginTop: 6 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {list.map((m) => (
                                <span key={m} style={{ display: "inline-flex", alignItems: "center", padding: "5px 9px", border: `1px solid rgba(212,178,120,0.4)`, borderRadius: 5, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: BRASS, background: "rgba(212,178,120,0.06)" }}>{m}</span>
                            ))}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(244,242,236,0.55)", maxWidth: 400 }}>{marksNote}</p>
                    </div>
                </div>

                <div className="sv-art" aria-hidden="true">
                    <svg ref={svg} viewBox="0 0 600 600" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
                        <defs>
                            <clipPath id="sv-loupe"><circle cx={lp.x} cy={lp.y} r={R} /></clipPath>
                            <radialGradient id="sv-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(212,178,120,0.16)" /><stop offset="100%" stopColor="rgba(212,178,120,0)" /></radialGradient>
                        </defs>
                        <circle cx="300" cy="300" r="300" fill="url(#sv-glow)" />
                        <Movement still={still} stroke="rgba(244,242,236,0.26)" width={1.1} />
                        <g clipPath="url(#sv-loupe)">
                            <circle cx={lp.x} cy={lp.y} r={R} fill="#0d0b08" />
                            <g transform={`translate(${lp.x} ${lp.y}) scale(${Z}) translate(${-lp.x} ${-lp.y})`}>
                                <Movement still={still} stroke={BRASS} width={0.9} />
                            </g>
                        </g>
                        <circle cx={lp.x} cy={lp.y} r={R} fill="none" stroke="rgba(244,242,236,0.75)" strokeWidth="1.4" />
                        <circle cx={lp.x} cy={lp.y} r={R + 7} fill="none" stroke="rgba(244,242,236,0.18)" strokeWidth="6" />
                    </svg>
                </div>
            </div>
        </section>
    )
}

addPropertyControls(ServiceHero, {
    eyebrow: { type: ControlType.String, title: "Eyebrow", defaultValue: "Watches and fine jewelry" },
    title: { type: ControlType.String, title: "Title", defaultValue: "Service and Repair" },
    line: { type: ControlType.String, title: "Line", defaultValue: "Your piece, in certified hands." },
    marks: { type: ControlType.String, title: "Hallmarks", defaultValue: "CMW21, WOSTEP, CMBJ" },
    marksNote: { type: ControlType.String, title: "Hallmark note", displayTextArea: true, defaultValue: "Watch work by CMW21 and WOSTEP certified watchmakers. Jewelry work by CMBJ certified bench jewelers." },
    cta: { type: ControlType.String, title: "Button", defaultValue: "Request service" },
    ctaLink: { type: ControlType.String, title: "Button link", defaultValue: "/service#request-service" },
    track: { type: ControlType.String, title: "Track link", defaultValue: "Track a repair" },
})
