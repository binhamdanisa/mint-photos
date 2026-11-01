import { useEffect, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Service hero: a real mechanical movement photographed close, full screen like the home and jewelry heroes.
// The only motion is one slow settle of the photograph, done in CSS on the GPU, so the page scrolls and swipes
// freely on every device. No pointer or touch listeners. Reduced motion and the Framer canvas show it at rest.

const CREAM = "#f4f2ec"
const BRASS = "#d4b278"
const LOGO = "https://cdn.jsdelivr.net/gh/binhamdanisa/mint-photos@2ca651bb4e07e18a77714def7cfcd9a41c909635/logos/"
const FONT = "'Bricolage Grotesque', sans-serif"

interface Props {
    photo?: string
    photoPhone?: string
    focus: number
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
@keyframes svSettle{from{transform:scale(1.08)}to{transform:scale(1)}}
@keyframes svUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes svFade{from{opacity:0}to{opacity:1}}
.sv-photo{animation:svFade 1.4s ease forwards,svSettle 16s cubic-bezier(.22,1,.36,1) forwards;will-change:transform;opacity:0}
.sv-in{opacity:0;animation:svUp 1.2s cubic-bezier(.22,1,.36,1) forwards}
.sv-arrow{display:inline-flex;align-items:center;gap:8px;transition:gap 250ms ease}
.sv-act:hover .sv-arrow{gap:12px}
.sv-act2:hover{color:#f4f2ec!important}
.sv-act:focus-visible{outline:1px solid ${BRASS};outline-offset:4px}
.sv-shade{background:linear-gradient(90deg,rgba(0,0,0,.86) 0%,rgba(0,0,0,.62) 32%,rgba(0,0,0,.12) 62%,rgba(0,0,0,0) 100%),linear-gradient(0deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 40%)}
.sv-copy{position:absolute;left:5vw;bottom:clamp(40px,9svh,96px);width:min(440px,90vw)}
.sv-marks li{height:52px}
@media (max-width:809px){
 .sv-shade{background:linear-gradient(0deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.7) 38%,rgba(0,0,0,.1) 66%,rgba(0,0,0,.25) 100%)}
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
        photoPhone = "",
        focus = 62,
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
    const [reduce, setReduce] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const still = reduce || canvas

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        const read = () => setReduce(mq.matches)
        read()
        mq.addEventListener ? mq.addEventListener("change", read) : (mq as any).addListener(read)
        return () => { mq.removeEventListener ? mq.removeEventListener("change", read) : (mq as any).removeListener(read) }
    }, [])

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
    const img: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focus}% 50%`, transformOrigin: `${focus}% 50%` }

    return (
        <section style={{ position: "relative", width: "100%", height: "100svh", minHeight: 600, maxHeight: 1100, background: "#000", color: CREAM, fontFamily: FONT, overflow: "hidden", ...style }}>
            <style>{CSS}</style>
            {photo ? (
                <picture>
                    {photoPhone ? <source media="(max-width: 809px)" srcSet={photoPhone} /> : null}
                    <img src={photo} alt="A mechanical watch movement up close: jewels, bridges and the gear train" className={still ? "" : "sv-photo"} fetchPriority="high" decoding="async" style={img} />
                </picture>
            ) : null}
            <div className="sv-shade" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

            <div className="sv-copy" style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 2 }}>
                <span className={inCls} style={{ ...anim(150), display: "inline-flex", alignItems: "center", gap: 12, fontSize: 10, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: BRASS }}>
                    <span style={{ width: 26, height: 1, background: BRASS, opacity: 0.7 }} />{eyebrow}
                </span>
                <h1 className={inCls} style={{ ...anim(270), margin: 0, fontSize: "clamp(28px, 2.6vw, 38px)", lineHeight: 1.1, fontWeight: 400, letterSpacing: "-0.02em" }}>{title}</h1>
                <p className={inCls} style={{ ...anim(390), margin: 0, fontSize: "clamp(16px, 1.3vw, 19px)", lineHeight: 1.4, fontWeight: 400, color: "rgba(244,242,236,0.85)" }}>{line}</p>
                <div className={inCls} style={{ ...anim(510), display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 22px", marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(244,242,236,0.16)" }}>
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
    photoPhone: { type: ControlType.Image, title: "Phone photo" },
    focus: { type: ControlType.Number, title: "Focus X", min: 0, max: 100, step: 1, unit: "%", defaultValue: 62 },
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
