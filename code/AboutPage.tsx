import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Mint Timepieces About page. Copy is carried over word for word from the previous page,
// with the corrected founder story. Motion is calm and respects reduced motion settings.

const SAGE = "#dce4d7"
const MINT = "#d4dccf"
const INK = "#1d1d1f"
const GOLD = "#a56f18"
const CREAM = "#f8f5f0"
const HEAD = "'Mattone', 'Geist', sans-serif"
const BODY = "'Geist', 'Bricolage Grotesque', sans-serif"
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

const APPROACH = [
    "Too often the watch market feels like a race to the bottom with cut corners and empty transactions. We decided to rewrite that story by putting people first and quality always at the forefront. Here, transparency is not just a buzzword but a promise. We elevate watch buying beyond the sale to a shared journey of discovery and trust.",
    "We believe every watch deserves honest care and every client deserves clarity and respect. No shortcuts, no fluff. Just genuine passion and expertise guiding you every step of the way.",
]
const PHILOSOPHY = [
    "Our business is built on a simple belief: watch collecting should be authentic, transparent, and respectful of your individual taste and time.",
    "Complication belongs in the movement, not the process. We follow three key rules in every step we take:",
]
const PRINCIPLES = [
    { title: "Honest Communication", body: "We keep it genuine because your trust cannot be earned any other way. Clear, open, and always with your best interest at heart.", icon: "talk" },
    { title: "Quality Over Quantity", body: "Our brand and collection is curated with purpose. Every watch has a story and a soul meant to be appreciated, not just sold.", icon: "loupe" },
    { title: "Service Beyond The Sale", body: "Think of us as the friend who’s always ready to help, long after you’ve left the showroom.", icon: "hand" },
]
const STORY_DEFAULT = [
    "Isa Hamdan was born and raised in Washington, D.C. New York was never home, but it became familiar ground. Regular trips to NYC to source supplies, sit with clients, and do business built relationships that still move watches today. The rule underneath it all started in Washington and never changed: know your product cold, treat people right, and let your name do the talking.",
    "Drawn in by the energy, history, and the way this industry connects so many different worlds through a single timepiece, I eventually moved to Los Angeles with a simple goal: to take what I had learned and build something thoughtful, something real. I joined Vacheron Constantin and then Rolex, where I saw firsthand what true craftsmanship and care looked like behind the scenes. I began to understand how much of this business depends on trust and the small moments most people overlook.",
    "This brand was built on instinct, taste, and trust. No investor money, no overnight hype. Just relationships earned, collections carefully curated, and a lifestyle that speaks louder than any sales pitch. Over the years, I have built a community of clients who appreciate what is real — the quality, the culture, and the conversations that come with each piece.",
    "What you see here is not just a storefront. It is a reflection of the world I have built around watches — where exclusivity is not about status but substance. Whether you are hunting for your first piece or your fiftieth, you are here because you care about the details. So do I.",
    "This is the result of that journey. A business rooted in people and shaped by time. Inspired by the honesty of the past and the standards of the great maisons, but always evolving. Built to offer more than a watch — something you feel good being a part of.",
].join("\n\n")
const TIMELINE = [
    { place: "Washington, D.C.", text: "Born and raised. Where the rule began: know your product cold, treat people right, and let your name do the talking." },
    { place: "New York", text: "Never home, but familiar ground. Regular trips to source supplies, sit with clients, and do business built relationships that still move watches today." },
    { place: "Los Angeles", text: "A move west with a simple goal: to take what had been learned and build something thoughtful, something real." },
    { place: "Vacheron Constantin, then Rolex", text: "A firsthand view of what true craftsmanship and care look like behind the scenes." },
    { place: "2018 · Mint Timepieces", text: "Built on instinct, taste, and trust. No investor money, no overnight hype." },
]
const PROCESS = "In the world of luxury watches, authenticity is not just a checkbox; it is the foundation. Every timepiece we offer undergoes a rigorous, hands-on inspection by experts who know what to look for, from serial numbers to the smallest design details. We do not rely on certificates alone; we verify provenance, condition, and originality to make sure you are getting the real deal. We know the market is flooded with fakes and shortcuts pretending to be the real thing. That is why we hold ourselves to the highest standards. When you buy from us, you are not just purchasing a watch; you are investing in trust, transparency, and peace of mind. Our authentication process is thorough, precise, and designed to eliminate doubt. We stand behind every piece we sell so you can flex your wrist with confidence, knowing it is one hundred percent legit — no exceptions, no compromises."
const COMMITMENTS = [
    { title: "Authenticity", body: "We hold ourselves to the highest standards when it comes to authenticity. Each timepiece undergoes rigorous expert inspection to guarantee its provenance, condition, and originality. There are no shortcuts or compromises here — only absolute transparency so you can invest with full confidence." },
    { title: "Bespoke Client Experience", body: "Our service goes far beyond transactions. We build lasting relationships rooted in trust, respect, and genuine care. From personalized consultations to seamless delivery, we tailor every step to your needs and preferences, ensuring your journey with us is as exceptional as the watch you choose." },
    { title: "Value and Support", body: "A luxury watch is a legacy, not just a purchase. We commit to offering timepieces that retain their value and significance while providing ongoing expert care to protect your investment. Our commitment to you lasts well beyond the sale, with dedicated support to keep your watch performing and looking its best for years to come." },
]

function useReducedMotion() {
    const [r, setR] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const m = window.matchMedia("(prefers-reduced-motion: reduce)")
        setR(m.matches)
        const on = () => setR(m.matches)
        m.addEventListener ? m.addEventListener("change", on) : m.addListener(on)
        return () => { m.removeEventListener ? m.removeEventListener("change", on) : m.removeListener(on) }
    }, [])
    return r
}

function useInView<T extends Element>(static_: boolean) {
    const ref = useRef<T>(null)
    const [seen, setSeen] = useState(static_)
    useEffect(() => {
        if (static_) { setSeen(true); return }
        const el = ref.current
        if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return }
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" })
        io.observe(el)
        return () => io.disconnect()
    }, [static_])
    return [ref, seen] as const
}

function Reveal({ children, delay = 0, still, style }: { children: ReactNode; delay?: number; still: boolean; style?: CSSProperties }) {
    const [ref, seen] = useInView<HTMLDivElement>(still)
    return (
        <div ref={ref} style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateY(18px)", transition: still ? "none" : "opacity 900ms " + EASE + " " + delay + "ms, transform 900ms " + EASE + " " + delay + "ms", ...style }}>
            {children}
        </div>
    )
}

function Counter({ to, decimals = 0, suffix = "", still, grouping = true }: { to: number; decimals?: number; suffix?: string; still: boolean; grouping?: boolean }) {
    const [ref, seen] = useInView<HTMLSpanElement>(still)
    const [v, setV] = useState(still ? to : 0)
    useEffect(() => {
        if (!seen) return
        if (still) { setV(to); return }
        let raf = 0
        const t0 = performance.now(), dur = 1600
        const step = (now: number) => {
            const p = Math.min(1, (now - t0) / dur)
            const e = 1 - Math.pow(1 - p, 3)
            setV(to * e)
            if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [seen, to, still])
    const shown = grouping ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals)
    return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>{shown}{suffix}</span>
}

function Icon({ name }: { name: string }) {
    const p = { fill: "none", stroke: INK, strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    return (
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            {name === "talk" ? (<><path {...p} d="M5 8.5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-5 4v-4H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><path {...p} d="M23 12.5h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2v3.5l-4.5-3.5" /></>) : null}
            {name === "loupe" ? (<><circle {...p} cx="13.5" cy="13.5" r="8" /><path {...p} d="m19.5 19.5 8 8M13.5 9.5v8M9.5 13.5h8" /></>) : null}
            {name === "hand" ? (<><path {...p} d="M4 18h5l6 4h7a2.5 2.5 0 0 0 0-5h-5" /><path {...p} d="M9 18l6.5-5a3 3 0 0 1 3.6-.1L27 18.5" /><circle {...p} cx="22" cy="7.5" r="3.5" /></>) : null}
            {name === "seal" ? (<><path {...p} d="M16 3.5 19 6l3.8-.4 1 3.7 3.4 1.8-1.2 3.6 1.2 3.6-3.4 1.8-1 3.7-3.8-.4L16 25.9l-3-2.5-3.8.4-1-3.7-3.4-1.8 1.2-3.6-1.2-3.6 3.4-1.8 1-3.7 3.8.4Z" /><path {...p} d="m11.5 14.5 3 3 6-6" /></>) : null}
            {name === "people" ? (<><circle {...p} cx="11.5" cy="11" r="4" /><path {...p} d="M4 25c.8-4 3.8-6.5 7.5-6.5S18.2 21 19 25" /><circle {...p} cx="22" cy="12" r="3.2" /><path {...p} d="M20.5 18.6c3.5-.4 6.6 1.8 7.5 6.4" /></>) : null}
            {name === "shield" ? (<><path {...p} d="M16 3.5 26 7v8.5c0 6.2-4.2 10.6-10 13-5.8-2.4-10-6.8-10-13V7Z" /><path {...p} d="M16 10v9M11.5 14.5h9" /></>) : null}
        </svg>
    )
}

function MMark({ size = 56, color = INK }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <path d="M14 48V18h3.6L32 37.5 46.4 18H50v30h-4.2V26.4L32 45 18.2 26.4V48Z" fill={color} />
            <path d="M11 50.5c.9-2.4 1.6-3.1 4-4-2.4-.9-3.1-1.6-4-4-.9 2.4-1.6 3.1-4 4 2.4.9 3.1 1.6 4 4Z" fill={GOLD} />
        </svg>
    )
}

interface Props {
    headshot?: { src?: string; srcSet?: string; alt?: string }
    story: string
    viewingLink: string
    textNumber: string
    style?: CSSProperties
}

/**
 * The About page for Mint Timepieces.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function AboutPage(props: Props) {
    const { headshot, story = STORY_DEFAULT, viewingLink = "/visit", textNumber = "+14242487674", style } = props
    const box = useRef<HTMLDivElement>(null)
    const [w, setW] = useState(1200)
    const reduce = useReducedMotion()
    const still = reduce || RenderTarget.current() === RenderTarget.canvas || RenderTarget.current() === RenderTarget.export
    const [entered, setEntered] = useState(still)
    useEffect(() => {
        const el = box.current
        if (el && typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
            ro.observe(el)
            setW(el.getBoundingClientRect().width || 1200)
            const t = setTimeout(() => setEntered(true), 60)
            return () => { ro.disconnect(); clearTimeout(t) }
        }
        setEntered(true)
    }, [])
    const phone = w < 640, tablet = w >= 640 && w < 1000
    const padX = phone ? 20 : tablet ? 36 : 56
    const gap = phone ? 72 : 112

    const eyebrow: CSSProperties = { fontFamily: BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: INK, display: "flex", alignItems: "center", gap: 12 }
    const rule = <span style={{ width: 22, height: 1, background: GOLD, display: "inline-block" }} />
    const h2: CSSProperties = { fontFamily: HEAD, fontWeight: 700, fontSize: phone ? 30 : tablet ? 36 : 44, lineHeight: 1.08, letterSpacing: "-0.02em", color: INK, margin: 0 }
    const p: CSSProperties = { fontFamily: BODY, fontSize: phone ? 16 : 17, lineHeight: 1.65, color: "rgba(29,29,31,0.78)", margin: 0 }
    const glass: CSSProperties = { background: "rgba(255,255,255,0.55)", backdropFilter: "blur(18px) saturate(140%)", WebkitBackdropFilter: "blur(18px) saturate(140%)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px -30px rgba(29,29,31,0.35)", borderRadius: 24 }
    const enter = (d: number): CSSProperties => ({ opacity: entered ? 1 : 0, transform: entered ? "none" : "translateY(22px)", transition: still ? "none" : "opacity 1100ms " + EASE + " " + d + "ms, transform 1100ms " + EASE + " " + d + "ms" })
    const inner: CSSProperties = { width: "100%", maxWidth: 1120, margin: "0 auto", padding: "0 " + padX + "px", boxSizing: "border-box" }
    const storyParas = (story || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)

    return (
        <div ref={box} style={{ width: "100%", background: CREAM, color: INK, fontFamily: BODY, overflow: "hidden", ...style }}>
            {/* Hero */}
            <section style={{ position: "relative", padding: (phone ? 120 : 168) + "px 0 " + (phone ? 64 : 96) + "px" }}>
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 65% at 88% 8%, " + SAGE + " 0%, rgba(220,228,215,0) 72%), radial-gradient(40% 45% at 6% 30%, rgba(212,220,207,0.7) 0%, rgba(212,220,207,0) 70%)", opacity: 0.9 }} />
                <div style={{ ...inner, position: "relative", display: "grid", gridTemplateColumns: phone || tablet ? "1fr" : "1.25fr 0.75fr", gap: phone ? 36 : 56, alignItems: "end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: phone ? 20 : 26 }}>
                        <div style={{ ...eyebrow, ...enter(0) }}>{rule}ABOUT MINT TIMEPIECES</div>
                        <h1 style={{ ...h2, fontSize: phone ? 44 : tablet ? 60 : 76, lineHeight: 1.0, ...enter(120) }}>The Beginning</h1>
                        <div style={{ ...enter(260), display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
                            <div style={{ ...eyebrow, fontSize: 10, color: "rgba(29,29,31,0.6)" }}>Our Approach</div>
                            {APPROACH.map((t) => <p key={t.slice(0, 20)} style={p}>{t}</p>)}
                        </div>
                    </div>
                    <div style={{ ...glass, ...enter(420), padding: phone ? 22 : 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ ...eyebrow, fontSize: 10, color: "rgba(29,29,31,0.55)" }}>Est.</span>
                            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: phone ? 26 : 30 }}>2018</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ ...eyebrow, fontSize: 10, color: "rgba(29,29,31,0.55)" }}>Rooted in</span>
                            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: phone ? 19 : 22, lineHeight: 1.15 }}>Washington, D.C.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust counters */}
            <section style={{ padding: "0 0 " + gap + "px" }}>
                <div style={inner}>
                    <Reveal still={still}>
                        <div style={{ ...glass, background: "rgba(220,228,215,0.55)", display: "grid", gridTemplateColumns: phone ? "1fr" : "repeat(3, 1fr)", padding: phone ? "8px 22px" : "8px 12px" }}>
                            {[
                                { k: "Established", v: <Counter to={2018} still={still} grouping={false} />, note: "Serving collectors since" },
                                { k: "Google rating", v: <span><Counter to={5} still={still} decimals={0} /><span style={{ color: GOLD, fontSize: "0.5em", marginLeft: 8, letterSpacing: "0.08em", verticalAlign: "middle" }}>★★★★★</span></span>, note: "Five star reviews from our clients" },
                                { k: "Authenticated in house", v: <Counter to={100} still={still} suffix="%" />, note: "Every piece examined before it is offered" },
                            ].map((s, i) => (
                                <div key={s.k} style={{ padding: phone ? "22px 0" : "26px 28px", borderTop: phone && i ? "1px solid rgba(29,29,31,0.08)" : "none", borderLeft: !phone && i ? "1px solid rgba(29,29,31,0.08)" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
                                    <span style={{ ...eyebrow, fontSize: 10, color: "rgba(29,29,31,0.55)" }}>{s.k}</span>
                                    <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: phone ? 40 : 48, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.v}</span>
                                    <span style={{ fontSize: 13, color: "rgba(29,29,31,0.6)" }}>{s.note}</span>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Philosophy and principles */}
            <section style={{ padding: "0 0 " + gap + "px" }}>
                <div style={{ ...inner, display: "flex", flexDirection: "column", gap: phone ? 32 : 44 }}>
                    <Reveal still={still} style={{ display: "grid", gridTemplateColumns: phone || tablet ? "1fr" : "0.9fr 1.1fr", gap: phone ? 18 : 56 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={eyebrow}>{rule}Our Core Principles</div>
                            <h2 style={h2}>Our Philosophy</h2>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{PHILOSOPHY.map((t) => <p key={t.slice(0, 20)} style={p}>{t}</p>)}</div>
                    </Reveal>
                    <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : "repeat(3, 1fr)", gap: phone ? 12 : 16 }}>
                        {PRINCIPLES.map((x, i) => (
                            <Reveal key={x.title} still={still} delay={i * 110}>
                                <div style={{ height: "100%", boxSizing: "border-box", background: "#fff", borderRadius: 22, padding: phone ? 22 : 28, display: "flex", flexDirection: "column", gap: 14, border: "1px solid rgba(29,29,31,0.06)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <Icon name={x.icon} />
                                        <span style={{ fontFamily: HEAD, fontSize: 13, color: GOLD }}>{String(i + 1).padStart(2, "0")}</span>
                                    </div>
                                    <h3 style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 21, lineHeight: 1.2, margin: 0 }}>{x.title}</h3>
                                    <p style={{ ...p, fontSize: 15 }}>{x.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Founder */}
            <section style={{ padding: gap + "px 0", background: "linear-gradient(180deg, rgba(220,228,215,0) 0%, rgba(220,228,215,0.55) 18%, rgba(220,228,215,0.35) 70%, rgba(248,245,240,0) 100%)" }}>
                <div style={{ ...inner, display: "flex", flexDirection: "column", gap: phone ? 40 : 64 }}>
                    <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : tablet ? "0.8fr 1.2fr" : "0.7fr 1.3fr", gap: phone ? 28 : 56, alignItems: "start" }}>
                        <Reveal still={still} style={{ position: phone ? "relative" : "sticky", top: 120 }}>
                            <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 14, maxWidth: phone ? 300 : 380 }}>
                                <div data-slot="headshot" aria-label="Headshot slot" style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", borderRadius: 24, overflow: "hidden", background: headshot && headshot.src ? MINT : "linear-gradient(160deg, " + SAGE + " 0%, " + MINT + " 100%)", border: "1px solid rgba(29,29,31,0.06)" }}>
                                    {headshot && headshot.src ? (
                                        <img src={headshot.src} srcSet={headshot.srcSet} alt={headshot.alt || "Isa Hamdan, founder of Mint Timepieces"} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <div style={{ ...glass, width: 96, height: 96, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}><MMark size={52} /></div>
                                        </div>
                                    )}
                                </div>
                                <figcaption style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 18 }}>Isa Hamdan</span>
                                    <span style={{ fontSize: 13, color: "rgba(29,29,31,0.6)" }}>Founder</span>
                                </figcaption>
                            </figure>
                        </Reveal>
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            <Reveal still={still}><div style={eyebrow}>{rule}One Man Showroom</div></Reveal>
                            <Reveal still={still} delay={80}><h2 style={h2}>Our Experience</h2></Reveal>
                            <Reveal still={still} delay={140}><p style={{ ...p, fontFamily: HEAD, fontSize: phone ? 18 : 21, lineHeight: 1.4, color: INK }}>From Geneva’s finest to your wrist guided by years inside the craft</p></Reveal>
                            {storyParas.map((t, i) => <Reveal key={i} still={still} delay={60}><p style={p}>{t}</p></Reveal>)}
                        </div>
                    </div>
                    {/* Timeline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 760, width: "100%", marginLeft: phone ? 0 : "auto" }}>
                        <Reveal still={still}><div style={{ ...eyebrow, marginBottom: 22 }}>{rule}The journey</div></Reveal>
                        {TIMELINE.map((t, i) => (
                            <Reveal key={t.place} still={still} delay={i * 90}>
                                <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: phone ? 14 : 20 }}>
                                    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                                        <span style={{ position: "absolute", top: 0, bottom: i === TIMELINE.length - 1 ? "calc(100% - 14px)" : 0, width: 1, background: "rgba(29,29,31,0.14)" }} />
                                        <span style={{ position: "relative", marginTop: 6, width: 9, height: 9, borderRadius: 999, background: i === TIMELINE.length - 1 ? GOLD : CREAM, border: "1px solid " + (i === TIMELINE.length - 1 ? GOLD : "rgba(29,29,31,0.45)") }} />
                                    </div>
                                    <div style={{ paddingBottom: i === TIMELINE.length - 1 ? 0 : 28, display: "flex", flexDirection: "column", gap: 6 }}>
                                        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: phone ? 17 : 19 }}>{t.place}</span>
                                        <span style={{ ...p, fontSize: 15 }}>{t.text}</span>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process */}
            <section style={{ padding: gap + "px 0 " + gap / 2 + "px" }}>
                <div style={{ ...inner }}>
                    <Reveal still={still}>
                        <div style={{ ...glass, background: "rgba(255,255,255,0.7)", padding: phone ? 24 : 48, display: "grid", gridTemplateColumns: phone || tablet ? "1fr" : "0.8fr 1.2fr", gap: phone ? 18 : 48 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={eyebrow}>{rule}Our Process</div>
                                <h2 style={h2}>No Fakes, Just Facts</h2>
                            </div>
                            <p style={p}>{PROCESS}</p>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Commitments */}
            <section style={{ padding: gap / 2 + "px 0 " + gap + "px" }}>
                <div style={{ ...inner, display: "flex", flexDirection: "column", gap: phone ? 24 : 36 }}>
                    <Reveal still={still}><h2 style={h2}>Our Commitments</h2></Reveal>
                    <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : tablet ? "1fr" : "repeat(3, 1fr)", gap: phone ? 12 : 16 }}>
                        {COMMITMENTS.map((x, i) => (
                            <Reveal key={x.title} still={still} delay={i * 110}>
                                <div style={{ height: "100%", boxSizing: "border-box", padding: phone ? 22 : 28, borderRadius: 22, background: i === 1 ? SAGE : "#fff", border: "1px solid rgba(29,29,31,0.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                                    <Icon name={["seal", "people", "shield"][i]} />
                                    <h3 style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 21, lineHeight: 1.2, margin: 0 }}>{x.title}</h3>
                                    <p style={{ ...p, fontSize: 15 }}>{x.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Closing call to action */}
            <section style={{ padding: "0 0 " + (phone ? 120 : gap) + "px" }}>
                <div style={inner}>
                    <Reveal still={still}>
                        <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, background: INK, color: "#fff", padding: phone ? "40px 24px" : "64px 56px", display: "flex", flexDirection: phone ? "column" : "row", alignItems: phone ? "flex-start" : "center", justifyContent: "space-between", gap: 28 }}>
                            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 80% at 100% 0%, rgba(220,228,215,0.18), rgba(220,228,215,0) 70%)" }} />
                            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
                                <div style={{ ...eyebrow, color: "rgba(255,255,255,0.7)" }}><span style={{ width: 22, height: 1, background: GOLD, display: "inline-block" }} />PRIVATE VIEWINGS</div>
                                <h2 style={{ ...h2, color: "#fff" }}>See it in person, at your pace.</h2>
                                <p style={{ ...p, color: "rgba(255,255,255,0.72)" }}>Book a private viewing in Los Angeles and spend time with the pieces that interest you, with no pressure and no rush.</p>
                            </div>
                            <div style={{ position: "relative", display: "flex", flexDirection: phone ? "column" : "row", gap: 12, width: phone ? "100%" : "auto" }}>
                                <a href={viewingLink} style={{ textAlign: "center", padding: "16px 26px", borderRadius: 999, background: "#fff", color: INK, fontWeight: 600, fontSize: 15, textDecoration: "none", whiteSpace: "nowrap" }}>Book a private viewing</a>
                                <a href={"sms:" + textNumber} style={{ textAlign: "center", padding: "16px 26px", borderRadius: 999, color: "#fff", fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1px solid rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>Text us</a>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>
        </div>
    )
}

addPropertyControls(AboutPage, {
    headshot: { type: ControlType.ResponsiveImage, title: "Headshot slot" },
    story: { type: ControlType.String, title: "Founder story", displayTextArea: true, defaultValue: STORY_DEFAULT },
    viewingLink: { type: ControlType.Link, title: "Viewing link", defaultValue: "/visit" },
    textNumber: { type: ControlType.String, title: "Text number", defaultValue: "+14242487674" },
})
