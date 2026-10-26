import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * Story chapters (Script 19 E4). One idea per screen: a single image and a single line,
 * changing quietly as the client scrolls, like walking the salon.
 * Product photography is shown whole: never cropped, never scaled.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

type Img = { src?: string; srcSet?: string; alt?: string }
interface Props {
    eyebrow: string
    image1?: Img; line1: string
    image2?: Img; line2: string
    image3?: Img; line3: string
    image4?: Img; line4: string
    linkLabel: string
    linkHref: string
    style?: CSSProperties
}

const INK = "rgb(49, 54, 48)"
const SAND = "#f7f2ea"
const SAGE = "#e8eee4"
const BRASS = "#a56f18"
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const FONT = "'Bricolage Grotesque', system-ui, sans-serif"

export default function StoryChapters(props: Props) {
    const { eyebrow = "", linkLabel = "", linkHref = "", style } = props
    const chapters = [
        { img: props.image1, line: props.line1 },
        { img: props.image2, line: props.line2 },
        { img: props.image3, line: props.line3 },
        { img: props.image4, line: props.line4 },
    ].filter((c) => (c.line || "").trim())
    const n = Math.max(1, chapters.length)
    const outer = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(0)
    const [still, setStill] = useState(false)
    const canvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        if (canvas) return
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
        setStill(reduce.matches)
        let raf = 0
        const update = () => {
            const el = outer.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const span = r.height - window.innerHeight
            const p = span > 0 ? Math.min(0.999, Math.max(0, -r.top / span)) : 0
            setActive(Math.floor(p * n))
        }
        const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll, { passive: true })
        update()
        return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf) }
    }, [n, canvas])

    const lineStyle: CSSProperties = { fontFamily: FONT, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.12, fontSize: "clamp(26px, 3.6vw, 44px)", color: INK, textWrap: "balance" as any, maxWidth: 760, margin: 0 }
    const eyebrowStyle: CSSProperties = { fontFamily: FONT, fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS }
    const imgStyle: CSSProperties = { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }

    const link = linkLabel && linkHref ? (
        <a href={linkHref} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: BRASS, textDecoration: "none", borderBottom: `1px solid ${BRASS}`, paddingBottom: 3 }}>{linkLabel}</a>
    ) : null

    // Canvas and reduced motion: the chapters simply stack, each one whole and still.
    if (canvas || still) {
        return (
            <div data-mm-skip="" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0, borderRadius: 28, overflow: "hidden", ...style }}>
                {chapters.map((c, i) => (
                    <div key={i} style={{ background: i % 2 ? SAGE : SAND, padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
                        <div style={eyebrowStyle}>{eyebrow} {String(i + 1).padStart(2, "0")}</div>
                        {c.img && c.img.src ? <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}><img src={c.img.src} srcSet={c.img.srcSet} alt={c.img.alt || ""} style={imgStyle} /></div> : null}
                        <p style={lineStyle}>{c.line}</p>
                        {i === chapters.length - 1 ? link : null}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div ref={outer} data-mm-skip="" style={{ position: "relative", width: "100%", height: `calc(${n} * 100svh)`, ...style }}>
            <div style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden", borderRadius: 28, background: active % 2 ? SAGE : SAND, transition: `background-color 1.2s ${EASE}` }}>
                {chapters.map((c, i) => {
                    const on = i === active
                    return (
                        <div key={i} aria-hidden={!on} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(18px, 3vh, 32px)", padding: "clamp(88px, 12vh, 120px) 24px clamp(56px, 9vh, 96px)", textAlign: "center", pointerEvents: on ? "auto" : "none" }}>
                            <div style={{ ...eyebrowStyle, opacity: on ? 1 : 0, transition: `opacity 0.9s ${EASE}` }}>{eyebrow} {String(i + 1).padStart(2, "0")}</div>
                            {c.img && c.img.src ? (
                                <div style={{ flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: on ? 1 : 0, transition: `opacity 1.1s ${EASE}` }}>
                                    <img src={c.img.src} srcSet={c.img.srcSet} sizes="(max-width: 810px) 90vw, 50vw" alt={c.img.alt || ""} loading={i === 0 ? "eager" : "lazy"} style={imgStyle} />
                                </div>
                            ) : null}
                            <p style={{ ...lineStyle, opacity: on ? 1 : 0, transform: on ? "none" : "translateY(14px)", transition: `opacity 1s ${EASE} ${on ? "0.15s" : "0s"}, transform 1s ${EASE} ${on ? "0.15s" : "0s"}` }}>{c.line}</p>
                            {i === chapters.length - 1 ? <div style={{ opacity: on ? 1 : 0, transition: `opacity 1s ${EASE} 0.35s` }}>{link}</div> : null}
                        </div>
                    )
                })}
                <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: "clamp(24px, 4vh, 40px)", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
                    {chapters.map((_, i) => (
                        <span key={i} style={{ width: 28, height: 1, background: BRASS, opacity: i === active ? 0.9 : 0.25, transition: `opacity 0.8s ${EASE}` }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

addPropertyControls(StoryChapters, {
    eyebrow: { type: ControlType.String, title: "Eyebrow", defaultValue: "Chapter" },
    image1: { type: ControlType.ResponsiveImage, title: "Image 1" },
    line1: { type: ControlType.String, title: "Line 1", defaultValue: "", displayTextArea: true },
    image2: { type: ControlType.ResponsiveImage, title: "Image 2" },
    line2: { type: ControlType.String, title: "Line 2", defaultValue: "", displayTextArea: true },
    image3: { type: ControlType.ResponsiveImage, title: "Image 3" },
    line3: { type: ControlType.String, title: "Line 3", defaultValue: "", displayTextArea: true },
    image4: { type: ControlType.ResponsiveImage, title: "Image 4" },
    line4: { type: ControlType.String, title: "Line 4", defaultValue: "", displayTextArea: true },
    linkLabel: { type: ControlType.String, title: "Link label", defaultValue: "Book a private viewing" },
    linkHref: { type: ControlType.String, title: "Link", defaultValue: "/visit" },
})
