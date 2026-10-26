import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface Props {
    style?: CSSProperties
    image?: { src?: string; srcSet?: string; alt?: string }
    alt: string
    lume: boolean
    lumeMask?: { src?: string }
    inspect: boolean
}

// Reads the centre of the photo to tell whether the dial is dark enough for a lume preview.
function useDarkDial(src?: string, enabled?: boolean) {
    const [dark, setDark] = useState(false)
    useEffect(() => {
        if (!src || !enabled || typeof window === "undefined") return
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            try {
                const c = document.createElement("canvas")
                const w = (c.width = 120), h = (c.height = Math.round((120 * img.naturalHeight) / img.naturalWidth))
                const ctx = c.getContext("2d")!
                ctx.drawImage(img, 0, 0, w, h)
                const r = Math.round(w * 0.2)
                const d = ctx.getImageData(Math.round(w / 2 - r), Math.round(h / 2 - r), r * 2, r * 2).data
                let sum = 0, n = 0
                for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++ }
                setDark(n > 0 && sum / n / 255 < 0.42)
            } catch (e) { setDark(false) }
        }
        img.src = src
    }, [src, enabled])
    return dark
}

const ZOOM = 2.4

/**
 * Tap to inspect: press and hold (or tap) the photo to magnify the dial, the stone or the detail under the finger.
 * Drag to move around while magnified. Release (or tap again) to return. The photo is never cropped or warped at rest.
 */
function useInspect(enabled: boolean) {
    const box = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState({ on: false, x: 50, y: 50, follow: false })
    useEffect(() => {
        const el = box.current
        if (!el || !enabled || RenderTarget.current() === RenderTarget.canvas) return
        const at = (cx: number, cy: number) => {
            const r = el.getBoundingClientRect()
            return { x: Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((cy - r.top) / r.height) * 100)) }
        }
        const skip = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("button,a,[data-no-inspect]")
        // Mouse and pen: hold to magnify, move to look around, release to return.
        let mouseDown = false
        const down = (e: PointerEvent) => {
            if (e.pointerType === "touch" || e.button !== 0 || skip(e.target)) return
            mouseDown = true
            setZoom({ on: true, ...at(e.clientX, e.clientY), follow: false })
        }
        const move = (e: PointerEvent) => { if (mouseDown) setZoom({ on: true, ...at(e.clientX, e.clientY), follow: true }) }
        const up = () => { if (mouseDown) { mouseDown = false; setZoom((z) => ({ ...z, on: false, follow: false })) } }
        // Touch: a quick tap toggles a closer look; a still press magnifies until release. Swipes still scroll the page.
        let sx = 0, sy = 0, held = false, locked = false, moved = false, timer: any = 0, t0 = 0
        const tStart = (e: TouchEvent) => {
            if (e.touches.length !== 1 || skip(e.target)) return
            const t = e.touches[0]
            sx = t.clientX; sy = t.clientY; moved = false; t0 = Date.now()
            clearTimeout(timer)
            if (locked) return
            timer = setTimeout(() => { if (!moved) { held = true; setZoom({ on: true, ...at(sx, sy), follow: false }) } }, 170)
        }
        const tMove = (e: TouchEvent) => {
            const t = e.touches[0]
            if (!t) return
            if (held || locked) { e.preventDefault(); setZoom({ on: true, ...at(t.clientX, t.clientY), follow: true }); return }
            if (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8) { moved = true; clearTimeout(timer) }
        }
        const tEnd = () => {
            clearTimeout(timer)
            if (held) { held = false; setZoom((z) => ({ ...z, on: false, follow: false })); return }
            if (moved || Date.now() - t0 > 400) return
            locked = !locked
            setZoom(locked ? { on: true, ...at(sx, sy), follow: false } : (z) => ({ ...z, on: false, follow: false }) as any)
        }
        el.addEventListener("pointerdown", down)
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("touchstart", tStart, { passive: true })
        el.addEventListener("touchmove", tMove, { passive: false })
        el.addEventListener("touchend", tEnd)
        el.addEventListener("touchcancel", tEnd)
        return () => {
            clearTimeout(timer)
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            el.removeEventListener("touchstart", tStart)
            el.removeEventListener("touchmove", tMove)
            el.removeEventListener("touchend", tEnd)
            el.removeEventListener("touchcancel", tEnd)
        }
    }, [enabled])
    return { box, zoom }
}

/**
 * A perfect square: height always equals width. The watch fills the full height, centred.
 * Optional lume preview with an iOS-style switch for dark-dial pieces.
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function FitImage(props: Props) {
    const { image, alt = "", lume = false, lumeMask, inspect = true, style } = props
    const maskSrc = lumeMask && lumeMask.src
    const src = image && image.src
    const fid = "lume" + useId().replace(/[^a-zA-Z0-9]/g, "")
    const canLume = !!maskSrc
    const [on, setOn] = useState(false)
    const night = lume && canLume && on
    const ease = "900ms cubic-bezier(0.22, 1, 0.36, 1)"
    const { box, zoom } = useInspect(inspect && !!src)
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const imgStyle: CSSProperties = { height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }
    const zoomStyle: CSSProperties = {
        transform: zoom.on ? `scale(${ZOOM})` : "scale(1)",
        transformOrigin: `${zoom.x}% ${zoom.y}%`,
        transition: reduce ? "none" : zoom.follow ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), transform-origin 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: zoom.on ? "transform" : undefined,
    }
    return (
        <div ref={box} data-mm-skip={inspect && src ? "" : undefined} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: inspect && src ? (zoom.on ? "zoom-out" : "zoom-in") : undefined, WebkitTouchCallout: "none", userSelect: "none", ...style, height: "auto", background: night ? "radial-gradient(70% 70% at 50% 45%, #121814 0%, #050706 100%)" : (style && style.background) as any, transition: "background " + ease }}>
            {src ? (
                <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", ...zoomStyle }}>
                    <img src={src} srcSet={image && image.srcSet} sizes="(max-width: 810px) 100vw, 50vw" alt={alt || (image && image.alt) || ""} draggable={false}
                        style={{ ...imgStyle, filter: night ? "brightness(0.13) saturate(0.4)" : "none", transition: "filter " + ease }} />
                    {lume && canLume ? (
                        <>
                            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgb(120, 255, 190)", WebkitMaskImage: "url(" + maskSrc + ")", maskImage: "url(" + maskSrc + ")", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", filter: "blur(7px)", opacity: night ? 0.95 : 0, transition: "opacity " + ease, pointerEvents: "none" }} />
                            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgb(205, 255, 228)", WebkitMaskImage: "url(" + maskSrc + ")", maskImage: "url(" + maskSrc + ")", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", opacity: night ? 1 : 0, transition: "opacity " + ease, pointerEvents: "none" }} />
                        </>
                    ) : null}
                </div>
            ) : null}
            {lume && canLume ? (
                <button type="button" onClick={() => setOn(!on)} aria-pressed={on} aria-label="Lume preview"
                    style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 10, padding: "7px 8px 7px 12px", borderRadius: 999, border: 0, cursor: "pointer", background: night ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.78)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "background " + ease, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 600, color: night ? "#fff" : "rgb(49,54,48)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
                    Lume
                    <span style={{ position: "relative", width: 44, height: 26, borderRadius: 999, background: on ? "rgb(52,199,89)" : "rgba(120,120,128,0.32)", transition: "background 250ms ease", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.25)", transition: "left 250ms cubic-bezier(0.3, 1.3, 0.5, 1)" }} />
                    </span>
                </button>
            ) : null}
            {night ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Lume preview</div> : null}
        </div>
    )
}

addPropertyControls(FitImage, {
    image: { type: ControlType.ResponsiveImage, title: "Image" },
    alt: { type: ControlType.String, title: "Alt text", defaultValue: "" },
    lume: { type: ControlType.Boolean, title: "Lume toggle", defaultValue: false },
    lumeMask: { type: ControlType.ResponsiveImage, title: "Lume mask" },
    inspect: { type: ControlType.Boolean, title: "Tap to inspect", defaultValue: true },
})
