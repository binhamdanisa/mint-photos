import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Jewelry hero, three acts.
// 1. Rest: black screen, one giant word that spans the width. The film plays only inside the letters.
// 2. Scroll: the word swells and dissolves, opening onto the film full screen.
// 3. Story: a chapter rail follows the film as it plays (drawn, modelled, set, finished), with the title and actions.
// Everything is sized from the viewport, so it is fluid on every screen. Reduced motion shows act 3 at once.

const CREAM = "#f4f2ec"
const CHAMPAGNE = "#d9c6a0"
const FONT = "'Bricolage Grotesque', sans-serif"

interface Props {
    video: string
    poster: string
    word: string
    eyebrow: string
    line: string
    title: string
    sub: string
    cta: string
    link: string
    style?: CSSProperties
}

const CHAPTERS = ["Drawn", "Modelled", "Set", "Finished"]
// Where each chapter begins in the film, in seconds, and which chapter it is.
const MARKS: [number, number][] = [[0, 3], [1.6, 0], [6.9, 1], [14.6, 2], [16.6, 3]]
// While the word is on screen, the letters loop the finished, sparkling chain.
const REST_LOOP: [number, number] = [17.6, 26.6]

const CSS = `
@keyframes mhUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes mhCue{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(6px);opacity:1}}
.mh-in{opacity:0;animation:mhUp 1.2s cubic-bezier(.22,1,.36,1) forwards}
.mh-cta:hover{background:${CREAM}!important;color:#000!important}
.mh-cta:focus-visible,.mh-link:focus-visible,.mh-chap:focus-visible{outline:1px solid ${CHAMPAGNE};outline-offset:4px}
.mh-link:hover span{border-bottom-color:${CREAM}!important}
.mh-chap:hover{opacity:1!important}
.mh-word{width:min(94vw,1500px);height:auto;display:block;overflow:visible}
@media (max-width:900px){.mh-word{height:min(32svh,340px)}}
@media (max-width:640px){.mh-word{height:min(40svh,330px)}}
`

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1)
const easeIn = (t: number) => t * t * t
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function chapterAt(t: number) {
    let c = MARKS[0][1], start = 0, end = Infinity
    for (let i = 0; i < MARKS.length; i++) {
        if (t >= MARKS[i][0]) { c = MARKS[i][1]; start = MARKS[i][0]; end = i + 1 < MARKS.length ? MARKS[i + 1][0] : Infinity }
    }
    return { c, start, end }
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function JewelryHero(props: Props) {
    const {
        video = "", poster = "",
        word = "JEWELRY",
        eyebrow = "Fine jewelry · Bespoke",
        line = "Every link set with diamonds. Every commission made by hand.",
        title = "The Infinity Cuban",
        sub = "From the first sketch to the final stone.",
        cta = "Discover the collection",
        link = "Begin a commission",
        style,
    } = props

    const root = useRef<HTMLDivElement>(null)
    const vid = useRef<HTMLVideoElement>(null)
    const knock = useRef<HTMLDivElement>(null)
    const restUi = useRef<HTMLDivElement>(null)
    const story = useRef<HTMLDivElement>(null)
    const shade = useRef<HTMLDivElement>(null)
    const bar = useRef<HTMLSpanElement>(null)
    const [chap, setChap] = useState(3)
    const [reduce, setReduce] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const still = reduce || canvas
    const pinned = !still
    const mode = useRef<"rest" | "story">("rest")

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        const read = () => setReduce(mq.matches)
        read()
        mq.addEventListener ? mq.addEventListener("change", read) : (mq as any).addListener(read)
        return () => { mq.removeEventListener ? mq.removeEventListener("change", read) : (mq as any).removeListener(read) }
    }, [])

    // Play while on screen, and follow the film with the chapter rail.
    useEffect(() => {
        const el = vid.current
        if (!el || canvas) return
        el.muted = true
        const play = () => { const p = el.play(); if (p && p.catch) p.catch(() => {}) }
        if (!reduce) play()
        const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => (e.isIntersecting && !reduce ? play() : el.pause()), { threshold: 0.05 }) : null
        io && io.observe(el)
        if (reduce) mode.current = "story"
        const start = () => { if (mode.current === "rest") { try { el.currentTime = REST_LOOP[0] } catch (e) {} } }
        if (el.readyState >= 1) start(); else el.addEventListener("loadedmetadata", start, { once: true })
        let raf = 0, last = -1
        const loop = () => {
            if (mode.current === "rest") {
                const t = el.currentTime || 0
                if (t < REST_LOOP[0] - 0.3 || t > REST_LOOP[1]) { try { el.currentTime = REST_LOOP[0] } catch (e) {} }
            }
            const { c, start, end } = chapterAt(el.currentTime || 0)
            if (c !== last) { last = c; setChap(c) }
            const span = (isFinite(end) ? end : el.duration || start + 10) - start
            if (bar.current) bar.current.style.transform = `scaleX(${clamp(((el.currentTime || 0) - start) / (span || 1), 0, 1).toFixed(3)})`
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => { io && io.disconnect(); cancelAnimationFrame(raf) }
    }, [canvas, reduce, video])

    // Scroll choreography.
    useEffect(() => {
        if (!pinned) return
        let raf = 0
        const apply = () => {
            raf = 0
            const el = root.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const travel = Math.max(1, r.height - window.innerHeight)
            const p = clamp(-r.top / travel, 0, 1)
            const open = easeIn(range(p, 0, 0.55))
            if (knock.current) {
                knock.current.style.transform = `scale(${(1 + open * 9).toFixed(4)})`
                knock.current.style.opacity = String(1 - range(p, 0.18, 0.5))
            }
            if (restUi.current) restUi.current.style.opacity = String(1 - range(p, 0, 0.16))
            const next = p > 0.34 ? "story" : "rest"
            if (next !== mode.current) {
                mode.current = next
                const v = vid.current
                if (v) { try { v.currentTime = next === "story" ? 0 : REST_LOOP[0] } catch (e) {} }
            }
            const s = easeOut(range(p, 0.42, 0.72))
            if (story.current) { story.current.style.opacity = String(s); story.current.style.transform = `translate3d(0, ${((1 - s) * 28).toFixed(1)}px, 0)`; story.current.style.pointerEvents = s > 0.6 ? "auto" : "none" }
            if (shade.current) shade.current.style.opacity = String(s)
        }
        const on = () => { if (!raf) raf = requestAnimationFrame(apply) }
        apply()
        window.addEventListener("scroll", on, { passive: true })
        window.addEventListener("resize", on)
        return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf) }
    }, [pinned])

    const seek = (i: number) => {
        const el = vid.current
        if (!el) return
        const m = MARKS.find(([, c], k) => c === i && k > 0) || MARKS[0]
        mode.current = "story"
        try { el.currentTime = m[0] + 0.05 } catch (e) {}
        if (!reduce) { const p = el.play(); if (p && p.catch) p.catch(() => {}) }
    }
    const scrollTo = (target: "shop" | "bespoke") => {
        if (typeof window === "undefined") return
        if (target === "bespoke") { const f = document.getElementById("bespoke"); if (f) { f.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); return } }
        const el = root.current
        if (el) window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY - 90, behavior: reduce ? "auto" : "smooth" })
    }

    const media: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
    const restVisible = !reduce // canvas shows the opening composition; reduced motion shows the story straight away
    const storyStatic: CSSProperties = still && !canvas ? { opacity: 1, pointerEvents: "auto" } : canvas ? { opacity: 0, pointerEvents: "none" } : { opacity: 0, pointerEvents: "none" }

    return (
        <div ref={root} style={{ position: "relative", width: "100%", height: pinned ? "240svh" : "auto", background: "#000", color: CREAM, fontFamily: FONT, ...style }}>
            <style>{CSS}</style>
            <div style={{ position: pinned ? "sticky" : "relative", top: 0, height: "100svh", minHeight: 560, overflow: "hidden", isolation: "isolate", background: "#000" }}>
                {/* the film */}
                {poster ? <img src={poster} alt="" aria-hidden="true" style={media} /> : null}
                {video && !canvas ? <video ref={vid} src={video} poster={poster || undefined} muted loop playsInline autoPlay={!reduce} preload="auto" aria-label="The Infinity Cuban, from the first sketch to the final stone" style={media} /> : null}

                {/* act 1: the word, with the film showing only through its letters */}
                {restVisible ? (
                    <div ref={knock} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#000", mixBlendMode: "multiply", display: "flex", alignItems: "center", justifyContent: "center", transformOrigin: "50% 50%", willChange: "transform, opacity" }}>
                        <svg className="mh-word" viewBox="0 0 1000 250" preserveAspectRatio="none">
                            <text x="500" y="222" textAnchor="middle" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="#fff" style={{ fontFamily: FONT, fontSize: 300, fontWeight: 700, letterSpacing: "-0.02em" }}>{word}</text>
                        </svg>
                    </div>
                ) : null}

                {restVisible ? (
                    <div ref={restUi} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "clamp(104px, 15svh, 140px) 6vw clamp(28px, 5svh, 48px)", pointerEvents: "none", zIndex: 2 }}>
                        <div className={canvas ? "" : "mh-in"} style={{ animationDelay: "200ms", fontSize: "clamp(10px, 0.85vw, 12px)", fontWeight: 500, letterSpacing: "0.34em", textTransform: "uppercase", color: CHAMPAGNE, textAlign: "center" }}>{eyebrow}</div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                            <p className={canvas ? "" : "mh-in"} style={{ animationDelay: "450ms", margin: 0, fontSize: "clamp(14px, 1.15vw, 17px)", lineHeight: 1.5, color: "rgba(244,242,236,0.8)", textAlign: "center", maxWidth: 440 }}>{line}</p>
                            <span aria-hidden="true" style={{ display: "block", width: 1, height: 34, background: `linear-gradient(${CHAMPAGNE}, transparent)`, animation: canvas ? undefined : "mhCue 2.2s ease-in-out infinite" }} />
                        </div>
                    </div>
                ) : null}

                {/* act 3: the story */}
                <div ref={shade} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 34%, rgba(0,0,0,0) 58%), linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%)", opacity: still && !canvas ? 1 : 0, pointerEvents: "none", zIndex: 1 }} />
                <div ref={story} style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, padding: "0 6vw clamp(28px, 6svh, 64px)", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "clamp(24px, 4vw, 64px)", ...storyStatic }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 1.2vw, 16px)", maxWidth: 560, flex: "1 1 320px" }}>
                        <h1 style={{ margin: 0, fontSize: "clamp(34px, 4.6vw, 72px)", lineHeight: 1, fontWeight: 300, letterSpacing: "-0.03em", fontVariationSettings: "'opsz' 96" }}>{title}</h1>
                        <p style={{ margin: 0, fontSize: "clamp(15px, 1.2vw, 18px)", lineHeight: 1.5, color: "rgba(244,242,236,0.78)" }}>{sub}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 26px", marginTop: 8 }}>
                            <button type="button" className="mh-cta" onClick={() => scrollTo("shop")} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: CREAM, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(244,242,236,0.75)", borderRadius: 999, padding: "0 28px", minHeight: 48, cursor: "pointer", transition: "background 300ms ease, color 300ms ease", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>{cta}</button>
                            <button type="button" className="mh-link" onClick={() => scrollTo("bespoke")} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: CREAM, background: "none", border: 0, padding: 0, minHeight: 44, cursor: "pointer" }}>
                                <span style={{ borderBottom: "1px solid rgba(244,242,236,0.45)", paddingBottom: 4, transition: "border-color 200ms ease" }}>{link}</span>
                            </button>
                        </div>
                    </div>
                    <ol aria-label="The making of the piece" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "clamp(10px, 1.6vw, 22px)", flex: "1 1 300px", maxWidth: 520 }}>
                        {CHAPTERS.map((c, i) => {
                            const on = i === chap
                            return (
                                <li key={c}>
                                    <button type="button" className="mh-chap" onClick={() => seek(i)} aria-current={on ? "step" : undefined} style={{ width: "100%", textAlign: "left", background: "none", border: 0, padding: "0 0 2px", cursor: "pointer", color: CREAM, fontFamily: FONT, opacity: on ? 1 : 0.42, transition: "opacity 400ms ease", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <span style={{ position: "relative", display: "block", height: 1, width: "100%", background: "rgba(244,242,236,0.25)", overflow: "hidden" }}>
                                            <span ref={on ? bar : undefined} style={{ position: "absolute", inset: 0, background: CHAMPAGNE, transformOrigin: "0 50%", transform: on ? undefined : "scaleX(0)" }} />
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", color: on ? CHAMPAGNE : CREAM }}>{"0" + (i + 1)}</span>
                                        <span style={{ fontSize: "clamp(13px, 1.05vw, 15px)", fontWeight: 400 }}>{c}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ol>
                </div>
            </div>
        </div>
    )
}

addPropertyControls(JewelryHero, {
    video: { type: ControlType.File, title: "Film", allowedFileTypes: ["mp4", "mov", "webm"] },
    poster: { type: ControlType.Image, title: "Poster" },
    word: { type: ControlType.String, title: "Word", defaultValue: "JEWELRY" },
    eyebrow: { type: ControlType.String, title: "Eyebrow", defaultValue: "Fine jewelry · Bespoke" },
    line: { type: ControlType.String, title: "Opening line", displayTextArea: true, defaultValue: "Every link set with diamonds. Every commission made by hand." },
    title: { type: ControlType.String, title: "Title", defaultValue: "The Infinity Cuban" },
    sub: { type: ControlType.String, title: "Subtitle", defaultValue: "From the first sketch to the final stone." },
    cta: { type: ControlType.String, title: "Button", defaultValue: "Discover the collection" },
    link: { type: ControlType.String, title: "Link", defaultValue: "Begin a commission" },
})
