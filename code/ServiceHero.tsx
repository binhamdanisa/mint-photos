import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Service hero: a real Swiss movement photographed close, full screen, under a watchmaker's loupe.
// Desktop: the loupe is the cursor and magnifies the real photograph wherever it goes.
// Phones: tap anywhere on the movement and the loupe glides there. Nothing captures a drag or a swipe,
// so the page always scrolls freely. Pointer work writes straight to the DOM (no React re-renders),
// and the only scroll effect is a GPU transform. Reduced motion and the Framer canvas show it at rest.

const CREAM = "#f4f2ec"
const BRASS = "#d4b278"
const LOGO = "https://cdn.jsdelivr.net/gh/binhamdanisa/mint-photos@2ca651bb4e07e18a77714def7cfcd9a41c909635/logos/"
const FONT = "'Bricolage Grotesque', sans-serif"

interface Props {
    photo?: string
    loupeImage?: string
    natW: number
    natH: number
    focus: number
    focusPhone: number
    zoom: number
    startX: number
    startY: number
    showText: boolean
    eyebrow: string
    title: string
    line: string
    awci?: string
    wostep?: string
    cmbj?: string
    marksNote: string
    cta: string
    ctaLink: string
    track: string
    style?: CSSProperties
}

const CSS = `
@keyframes svUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes svFade{from{opacity:0}to{opacity:1}}
@keyframes svLoupeIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
.sv-stage{position:absolute;inset:0;will-change:transform;transform:scale(var(--svz,1));transform-origin:50% 40%}
.sv-photo{opacity:0;animation:svFade 1.2s ease forwards}
.sv-in{opacity:0;animation:svUp 1.2s cubic-bezier(.22,1,.36,1) forwards}
.sv-arrow{display:inline-flex;align-items:center;gap:8px;transition:gap 250ms ease}
.sv-act:hover .sv-arrow{gap:12px}
.sv-act2:hover{color:#f4f2ec!important}
.sv-act:focus-visible{outline:1px solid ${BRASS};outline-offset:4px}
.sv-shade{background:linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.66) 30%,rgba(0,0,0,.14) 60%,rgba(0,0,0,0) 100%),linear-gradient(0deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,0) 42%)}
.sv-copy{position:absolute;left:5vw;bottom:clamp(40px,9svh,96px);width:min(440px,90vw)}
.sv-marks li{height:52px}
.sv-loupe{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;background-repeat:no-repeat;will-change:transform,background-position;
 box-shadow:0 0 0 1.5px rgba(244,242,236,.85),0 0 0 7px rgba(10,10,10,.55),0 0 0 8px rgba(212,178,120,.55),0 24px 60px -10px rgba(0,0,0,.8),inset 0 0 30px rgba(0,0,0,.45)}
.sv-loupe-wrap{position:absolute;left:0;top:0;will-change:transform}
.sv-loupe-wrap.glide{transition:transform 650ms cubic-bezier(.22,1,.36,1)}
.sv-loupe-wrap.glide .sv-loupe{transition:background-position 650ms cubic-bezier(.22,1,.36,1)}
.sv-loupe-in{animation:svLoupeIn 900ms 700ms cubic-bezier(.22,1,.36,1) both}
.sv-hit{position:absolute;inset:0;touch-action:pan-y pinch-zoom}
@media (hover:hover) and (pointer:fine){.sv-hit{cursor:none}}
@media (max-width:809px){
 .sv-shade{background:linear-gradient(0deg,rgba(0,0,0,.94) 0%,rgba(0,0,0,.74) 40%,rgba(0,0,0,.08) 68%,rgba(0,0,0,.3) 100%)}
 .sv-copy{left:20px;right:20px;width:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 32px)}
 .sv-marks li{height:44px;padding-left:16px!important;padding-right:16px!important}
 .sv-marks li:first-child{padding-left:0!important}
 .sv-marks img{transform:scale(.86);transform-origin:left center}
}
`

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function ServiceHero(props: Props) {
    const {
        photo = "",
        loupeImage = "",
        natW = 5690,
        natH = 3985,
        focus = 50,
        focusPhone = 58,
        zoom = 2.4,
        startX = 66,
        startY = 31,
        showText = true,
        eyebrow = "Watches and fine jewelry",
        title = "Service and Repair",
        line = "Your piece, in certified hands.",
        awci = "",
        wostep = "",
        cmbj = "",
        marksNote = "Watch work by CMW21 and WOSTEP certified watchmakers. Jewelry work by CMBJ certified bench jewelers.",
        cta = "Request service",
        ctaLink = "/service#request-service",
        track = "Track a repair",
        style,
    } = props
    const root = useRef<HTMLElement>(null)
    const stage = useRef<HTMLDivElement>(null)
    const wrap = useRef<HTMLDivElement>(null)
    const lens = useRef<HTMLDivElement>(null)
    const [reduce, setReduce] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const still = reduce || canvas
    const big = loupeImage || photo

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        const read = () => setReduce(mq.matches)
        read()
        mq.addEventListener ? mq.addEventListener("change", read) : (mq as any).addListener(read)
        return () => { mq.removeEventListener ? mq.removeEventListener("change", read) : (mq as any).removeListener(read) }
    }, [])

    // Loupe geometry, all in the stage's own (unscaled) pixels.
    useEffect(() => {
        const el = root.current, st = stage.current, wr = wrap.current, ln = lens.current
        if (!el || !st || !wr || !ln || !photo) return
        let W = 0, H = 0, dw = 0, dh = 0, ox = 0, oy = 0, R = 90, phone = false, z = 1
        let tx = 0, ty = 0, raf = 0, pending = false
        const measure = () => {
            const r = el.getBoundingClientRect()
            W = r.width; H = r.height; phone = W < 810
            const fx = (phone ? focusPhone : focus) / 100
            const s = Math.max(W / natW, H / natH)
            dw = natW * s; dh = natH * s; ox = (W - dw) * fx; oy = (H - dh) * 0.5
            R = Math.round(Math.max(64, Math.min(130, Math.min(W, H) * (phone ? 0.2 : 0.14))))
            ln.style.width = ln.style.height = R * 2 + "px"
            ln.style.backgroundSize = `${dw * zoom}px ${dh * zoom}px`
        }
        const draw = () => {
            pending = false
            wr.style.transform = `translate3d(${tx - R}px, ${ty - R}px, 0)`
            ln.style.backgroundPosition = `${-((tx - ox) * zoom - R)}px ${-((ty - oy) * zoom - R)}px`
        }
        const put = (x: number, y: number) => { tx = Math.max(0, Math.min(W, x)); ty = Math.max(0, Math.min(H, y)); if (!pending) { pending = true; raf = requestAnimationFrame(draw) } }
        const start = () => {
            // Park the loupe over the jewel named by startX/startY (percent of the photograph), kept on screen.
            let x = ox + dw * (startX / 100), y = oy + dh * (startY / 100)
            const pad = R + 16
            x = Math.max(pad, Math.min(W - pad, x)); y = Math.max(pad + (phone ? 90 : 100), Math.min(H * (phone ? 0.5 : 0.8), y))
            put(x, y)
        }
        // Screen point to stage point, undoing the scroll zoom (origin 50% 40%).
        const local = (cx: number, cy: number) => {
            const r = el.getBoundingClientRect()
            const px = cx - r.left, py = cy - r.top, ax = W * 0.5, ay = H * 0.4
            return [ax + (px - ax) / z, ay + (py - ay) / z]
        }
        measure(); start(); draw()
        if (still) return
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { measure(); start() }) : null
        ro && ro.observe(el)

        const hit = el.querySelector(".sv-hit") as HTMLElement | null
        let down: { x: number; y: number; t: number } | null = null
        const move = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return
            wr.classList.remove("glide")
            const [x, y] = local(e.clientX, e.clientY); put(x, y)
        }
        const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") { wr.classList.add("glide"); start() } }
        const pdown = (e: PointerEvent) => { if (e.pointerType !== "mouse") down = { x: e.clientX, y: e.clientY, t: Date.now() } }
        const pup = (e: PointerEvent) => {
            if (e.pointerType === "mouse" || !down) return
            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = Date.now() - down.t < 450
            down = null
            if (moved > 10 || !quick) return // a swipe or a hold: leave it to the page
            wr.classList.add("glide")
            const [x, y] = local(e.clientX, e.clientY); put(x, y)
        }
        const cancel = () => { down = null }
        hit && hit.addEventListener("pointermove", move, { passive: true })
        hit && hit.addEventListener("pointerleave", leave, { passive: true })
        hit && hit.addEventListener("pointerdown", pdown, { passive: true })
        hit && hit.addEventListener("pointerup", pup, { passive: true })
        hit && hit.addEventListener("pointercancel", cancel, { passive: true })

        // A slow push into the movement as the hero scrolls away. Transform only.
        let sraf = 0
        const onScroll = () => {
            if (sraf) return
            sraf = requestAnimationFrame(() => {
                sraf = 0
                const r = el.getBoundingClientRect()
                const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)))
                z = 1 + p * 0.18
                st.style.setProperty("--svz", z.toFixed(4))
            })
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        onScroll()
        return () => {
            cancelAnimationFrame(raf); cancelAnimationFrame(sraf); ro && ro.disconnect()
            window.removeEventListener("scroll", onScroll)
            if (hit) { hit.removeEventListener("pointermove", move); hit.removeEventListener("pointerleave", leave); hit.removeEventListener("pointerdown", pdown); hit.removeEventListener("pointerup", pup); hit.removeEventListener("pointercancel", cancel) }
        }
    }, [photo, big, still, natW, natH, focus, focusPhone, zoom, startX, startY])

    const toTrack = () => {
        if (typeof document === "undefined") return
        const el = document.querySelector('[data-framer-name="Track Your Service"]') as HTMLElement | null
        if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    }
    const anim = (d: number): CSSProperties => (still ? {} : { animationDelay: d + "ms" })
    const inCls = still ? "" : "sv-in"
    const logos = [
        { src: awci || LOGO + "awci-mark.svg", alt: "AWCI, Certified Master Watchmaker of the 21st Century (CMW21)", h: 24 },
        { src: wostep || LOGO + "wostep-mark.svg", alt: "WOSTEP certified watchmaker", h: 17 },
        { src: cmbj || LOGO + "cmbj-mark.svg", alt: "JA Bench Professional Certification, Certified Master Bench Jeweler (CMBJ)", h: 52 },
    ]

    return (
        <section ref={root} style={{ position: "relative", width: "100%", height: "100svh", minHeight: 600, maxHeight: 1100, background: "#000", color: CREAM, fontFamily: FONT, overflow: "hidden", ...style }}>
            <style>{CSS}</style>
            <div ref={stage} className="sv-stage">
                {photo ? (
                    <>
                        <img src={photo} alt="A Swiss automatic watch movement up close: jewels, bridges, balance and rotor" className={still ? "" : "sv-photo"} fetchPriority="high" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "var(--svfx,50%) 50%" }} />
                        <style>{`.sv-stage img{--svfx:${focus}%}@media (max-width:809px){.sv-stage img{--svfx:${focusPhone}%}}`}</style>
                        <div ref={wrap} className="sv-loupe-wrap" aria-hidden="true">
                            <div ref={lens} className={"sv-loupe" + (still ? "" : " sv-loupe-in")} style={{ backgroundImage: `url("${big}")` }} />
                        </div>
                    </>
                ) : null}
            </div>
            <div className="sv-shade" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
            <div className="sv-hit" aria-hidden="true" />

            <div className="sv-copy" style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 2 }}>
                {showText ? (
                    <>
                        <span className={inCls} style={{ ...anim(150), display: "inline-flex", alignItems: "center", gap: 12, fontSize: 10, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: BRASS }}>
                            <span style={{ width: 26, height: 1, background: BRASS, opacity: 0.7 }} />{eyebrow}
                        </span>
                        <h1 className={inCls} style={{ ...anim(270), margin: 0, fontSize: "clamp(28px, 2.6vw, 38px)", lineHeight: 1.1, fontWeight: 400, letterSpacing: "-0.02em" }}>{title}</h1>
                        <p className={inCls} style={{ ...anim(390), margin: 0, fontSize: "clamp(16px, 1.3vw, 19px)", lineHeight: 1.4, fontWeight: 400, color: "rgba(244,242,236,0.85)" }}>{line}</p>
                    </>
                ) : (
                    // Not shown, but kept for search engines and screen readers.
                    <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{title}</h1>
                )}
                <div className={inCls} style={{ ...anim(showText ? 510 : 200), display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 22px", marginTop: showText ? 4 : 0, paddingTop: showText ? 12 : 0, borderTop: showText ? "1px solid rgba(244,242,236,0.16)" : "none" }}>
                    <a className="sv-act" href={ctaLink} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: CREAM, textDecoration: "none", minHeight: 40, display: "inline-flex", alignItems: "center" }}><span className="sv-arrow">{cta}<span aria-hidden="true">→</span></span></a>
                    <button type="button" className="sv-act sv-act2" onClick={toTrack} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(244,242,236,0.72)", background: "none", border: 0, padding: 0, minHeight: 40, cursor: "pointer", transition: "color 200ms ease" }}><span className="sv-arrow">{track}<span aria-hidden="true">→</span></span></button>
                </div>
                <div className={inCls} style={{ ...anim(650), display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
                    <ul className="sv-marks" aria-label="Certifications" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "nowrap", alignItems: "center" }}>
                        {logos.map((l, i) => (
                            <li key={l.alt} style={{ display: "flex", alignItems: "center", boxSizing: "border-box", padding: i === 0 ? "0 22px 0 0" : "0 22px", borderLeft: i === 0 ? "none" : "1px solid rgba(244,242,236,0.16)" }}>
                                <img src={l.src} alt={l.alt} title={l.alt} loading="lazy" decoding="async" style={{ display: "block", height: l.h, width: "auto", opacity: 0.9 }} />
                            </li>
                        ))}
                    </ul>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(244,242,236,0.62)", maxWidth: 400 }}>{marksNote}</p>
                </div>
            </div>
        </section>
    )
}

addPropertyControls(ServiceHero, {
    photo: { type: ControlType.Image, title: "Photo" },
    loupeImage: { type: ControlType.Image, title: "Loupe photo (large)" },
    natW: { type: ControlType.Number, title: "Photo width", min: 100, max: 20000, step: 1, defaultValue: 5690 },
    natH: { type: ControlType.Number, title: "Photo height", min: 100, max: 20000, step: 1, defaultValue: 3985 },
    focus: { type: ControlType.Number, title: "Focus X", min: 0, max: 100, step: 1, unit: "%", defaultValue: 50 },
    focusPhone: { type: ControlType.Number, title: "Phone focus X", min: 0, max: 100, step: 1, unit: "%", defaultValue: 58 },
    zoom: { type: ControlType.Number, title: "Loupe zoom", min: 1.2, max: 5, step: 0.1, defaultValue: 2.4 },
    startX: { type: ControlType.Number, title: "Loupe start X", min: 0, max: 100, step: 1, unit: "%", defaultValue: 66 },
    startY: { type: ControlType.Number, title: "Loupe start Y", min: 0, max: 100, step: 1, unit: "%", defaultValue: 31 },
    showText: { type: ControlType.Boolean, title: "Headline", defaultValue: true, enabledTitle: "Show", disabledTitle: "Hide" },
    eyebrow: { type: ControlType.String, title: "Eyebrow", defaultValue: "Watches and fine jewelry" },
    title: { type: ControlType.String, title: "Title", defaultValue: "Service and Repair" },
    line: { type: ControlType.String, title: "Line", defaultValue: "Your piece, in certified hands." },
    awci: { type: ControlType.Image, title: "AWCI logo" },
    wostep: { type: ControlType.Image, title: "WOSTEP logo" },
    cmbj: { type: ControlType.Image, title: "CMBJ logo" },
    marksNote: { type: ControlType.String, title: "Hallmark note", displayTextArea: true, defaultValue: "Watch work by CMW21 and WOSTEP certified watchmakers. Jewelry work by CMBJ certified bench jewelers." },
    cta: { type: ControlType.String, title: "Button", defaultValue: "Request service" },
    ctaLink: { type: ControlType.String, title: "Button link", defaultValue: "/service#request-service" },
    track: { type: ControlType.String, title: "Track link", defaultValue: "Track a repair" },
})
