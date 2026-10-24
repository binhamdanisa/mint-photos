import { forwardRef, useEffect, useRef, type ComponentType } from "react"
import { RenderTarget } from "framer"

// Five hero indicator options for the home page featured slides (Hero Option M1 to M5).
// Hard rule: nothing ever sits on the watch photograph. Every indicator is built inside each
// slide's Caption card. All options crossfade, pause on hover or touch, and accept swipes.

type Mode = "M1" | "M2" | "M3" | "M4" | "M5"
const GOLD = "rgb(165, 111, 24)"
const FONT = "'Bricolage Grotesque', sans-serif"
const DURATION = 5200

function assignRef(ref: any, value: any) { if (typeof ref === "function") ref(value); else if (ref) ref.current = value }
const pad = (n: number) => String(n).padStart(2, "0")
const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration> | Record<string, string>) => Object.assign(el.style, s)
const make = (tag: string, s: Record<string, string> = {}, text = "") => { const e = document.createElement(tag); css(e, s); if (text) e.textContent = text; return e }

function arrow(dir: "prev" | "next", size = 30) {
    const b = make("button", { width: size + "px", height: size + "px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "0", transition: "background 200ms, border-color 200ms" }) as HTMLButtonElement
    b.type = "button"
    b.setAttribute("aria-label", dir === "prev" ? "Previous piece" : "Next piece")
    b.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="' + (dir === "prev" ? "M7.5 2.5 4 6l3.5 3.5" : "M4.5 2.5 8 6 4.5 9.5") + '" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    b.onmouseenter = () => css(b, { background: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.4)" })
    b.onmouseleave = () => css(b, { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.22)" })
    return b
}

function build(mode: Mode) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return forwardRef<any, any>(function HeroOption(props, ref) {
            const node = useRef<HTMLElement | null>(null)
            useEffect(() => {
                const root = node.current
                if (!root || RenderTarget.current() === RenderTarget.canvas) return
                const items = Array.from(root.children).filter((c) => c instanceof HTMLElement) as HTMLElement[]
                if (items.length < 2) return
                const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
                css(root, { position: "relative" })
                items.forEach((el, i) => css(el, { position: i === 0 ? "relative" : "absolute", inset: i === 0 ? "" : "0", width: "100%", transition: "opacity 1100ms cubic-bezier(0.22, 1, 0.36, 1)", opacity: i === 0 ? "1" : "0", pointerEvents: i === 0 ? "auto" : "none", zIndex: i === 0 ? "1" : "0" }))
                const captions = items.map((it) => (it.querySelector('[data-framer-name="Caption"]') as HTMLElement) || it)
                const photos = items.map((it) => { const img = it.querySelector("img") as HTMLImageElement | null; return img ? img.currentSrc || img.src : "" })
                const n = items.length
                let index = 0, started = performance.now(), paused = false, pausedAt = 0, frame = 0
                const updaters: ((i: number, t: number) => void)[] = []
                const cleanups: (() => void)[] = []

                captions.forEach((cap) => {
                    if (getComputedStyle(cap).position === "static") cap.style.position = "relative"
                    const ui = make("div"); ui.dataset.heroUi = "1"
                    if (mode === "M1") {
                        css(ui, { position: "absolute", top: "18px", right: "18px", display: "flex", alignItems: "center", gap: "10px", zIndex: "2" })
                        const prev = arrow("prev", 28), next = arrow("next", 28)
                        const num = make("span", { fontFamily: FONT, fontSize: "11px", fontWeight: "700", letterSpacing: "0.16em", color: "rgba(255,255,255,0.86)", fontVariantNumeric: "tabular-nums" })
                        prev.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(index - 1) }
                        next.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(index + 1) }
                        ui.append(prev, num, next)
                        updaters.push((i) => { num.textContent = pad(i + 1) + " / " + pad(n) })
                    } else if (mode === "M2") {
                        css(ui, { position: "absolute", left: "20px", right: "20px", bottom: "12px", display: "flex", gap: "6px", zIndex: "2" })
                        const fills: HTMLElement[] = []
                        for (let k = 0; k < n; k++) {
                            const seg = make("button", { flex: "1", height: "12px", padding: "0", border: "0", background: "transparent", cursor: "pointer", position: "relative" }) as HTMLButtonElement
                            seg.type = "button"; seg.setAttribute("aria-label", "Show piece " + (k + 1))
                            const track = make("span", { position: "absolute", left: "0", right: "0", top: "5px", height: "2px", borderRadius: "2px", background: "rgba(255,255,255,0.2)", overflow: "hidden" })
                            const fill = make("span", { position: "absolute", left: "0", top: "0", bottom: "0", width: "0%", background: GOLD })
                            track.append(fill); seg.append(track); ui.append(seg); fills.push(fill)
                            seg.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(k) }
                        }
                        updaters.push((i, t) => fills.forEach((f, k) => { f.style.width = k < i ? "100%" : k === i ? (t * 100).toFixed(1) + "%" : "0%"; f.style.background = k === i ? GOLD : "rgba(255,255,255,0.55)" }))
                    } else if (mode === "M3") {
                        css(ui, { position: "absolute", right: "20px", bottom: "20px", display: "flex", alignItems: "center", gap: "6px", zIndex: "2" })
                        const dots: HTMLElement[] = []
                        for (let k = 0; k < n; k++) {
                            const d = make("button", { width: "6px", height: "6px", borderRadius: "999px", border: "0", padding: "0", background: "rgba(255,255,255,0.35)", cursor: "pointer", transition: "width 420ms cubic-bezier(0.22,1,0.36,1), background 300ms" }) as HTMLButtonElement
                            d.type = "button"; d.setAttribute("aria-label", "Show piece " + (k + 1))
                            d.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(k) }
                            ui.append(d); dots.push(d)
                        }
                        updaters.push((i) => dots.forEach((d, k) => css(d, { width: k === i ? "20px" : "6px", background: k === i ? GOLD : "rgba(255,255,255,0.35)" })))
                    } else if (mode === "M4") {
                        css(ui, { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "8px", zIndex: "2" })
                        const prev = arrow("prev", 32), next = arrow("next", 32)
                        prev.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(index - 1) }
                        next.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(index + 1) }
                        ui.append(prev, next)
                    } else {
                        css(ui, { display: "flex", gap: "8px", marginTop: "14px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" })
                        const chips: HTMLElement[] = []
                        photos.forEach((src, k) => {
                            const c = make("button", { flex: "0 0 auto", width: "46px", height: "46px", borderRadius: "12px", padding: "4px", border: "0", cursor: "pointer", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)", transition: "box-shadow 260ms, background 260ms" }) as HTMLButtonElement
                            c.type = "button"; c.setAttribute("aria-label", "Show piece " + (k + 1))
                            if (src) { const im = make("img", { width: "100%", height: "100%", objectFit: "contain", display: "block" }) as HTMLImageElement; im.src = src; im.alt = ""; c.append(im) }
                            c.onclick = (e) => { e.preventDefault(); e.stopPropagation(); go(k) }
                            ui.append(c); chips.push(c)
                        })
                        updaters.push((i) => chips.forEach((c, k) => css(c, { boxShadow: k === i ? "inset 0 0 0 1.5px " + GOLD : "inset 0 0 0 1px rgba(255,255,255,0.14)", background: k === i ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)" })))
                    }
                    if (mode === "M2") cap.style.paddingBottom = Math.max(parseFloat(getComputedStyle(cap).paddingBottom) || 0, 30) + "px"
                    if (mode === "M1" || mode === "M4") cap.style.paddingRight = Math.max(parseFloat(getComputedStyle(cap).paddingRight) || 0, mode === "M4" ? 64 : 0) + "px"
                    cap.append(ui)
                    cleanups.push(() => ui.remove())
                })

                const render = (t: number) => updaters.forEach((u) => u(index, t))
                function go(next: number) {
                    const k = ((next % n) + n) % n
                    items.forEach((it, i) => css(it, { opacity: i === k ? "1" : "0", pointerEvents: i === k ? "auto" : "none", zIndex: i === k ? "1" : "0", position: i === k ? "relative" : "absolute", inset: i === k ? "" : "0" }))
                    index = k; started = performance.now(); render(0)
                }
                const tick = (now: number) => {
                    if (!paused) { const t = Math.min(1, (now - started) / DURATION); render(t); if (t >= 1) go(index + 1) }
                    frame = requestAnimationFrame(tick)
                }
                const pause = () => { if (!paused) { paused = true; pausedAt = performance.now() } }
                const resume = () => { if (paused) { started += performance.now() - pausedAt; paused = false } }
                let x0 = 0, y0 = 0, touching = false
                const ts = (e: TouchEvent) => { touching = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; pause() }
                const te = (e: TouchEvent) => { if (!touching) return; touching = false; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1)); setTimeout(resume, 2400) }
                root.addEventListener("mouseenter", pause); root.addEventListener("mouseleave", resume)
                root.addEventListener("touchstart", ts, { passive: true }); root.addEventListener("touchend", te)
                go(0)
                if (!reduce) frame = requestAnimationFrame(tick)
                return () => {
                    cancelAnimationFrame(frame); cleanups.forEach((f) => f())
                    root.removeEventListener("mouseenter", pause); root.removeEventListener("mouseleave", resume)
                    root.removeEventListener("touchstart", ts); root.removeEventListener("touchend", te)
                }
            }, [])
            return <Component {...props} ref={(v: any) => { node.current = v; assignRef(ref, v) }} />
        })
    }
}

// Hero Option M1: quiet 01 / 05 counter with slim arrows, top corner of the card
export function withHeroM1(Component: ComponentType<any>): ComponentType<any> {
    return build("M1")(Component)
}
// Hero Option M2: fine segments along the bottom edge of the card, active one fills in gold
export function withHeroM2(Component: ComponentType<any>): ComponentType<any> {
    return build("M2")(Component)
}
// Hero Option M3: refined dots bottom right in the card, active dot becomes a short gold pill
export function withHeroM3(Component: ComponentType<any>): ComponentType<any> {
    return build("M3")(Component)
}
// Hero Option M4: no indicator, elegant crossfade, swipe plus two minimal arrows at the card edge
export function withHeroM4(Component: ComponentType<any>): ComponentType<any> {
    return build("M4")(Component)
}
// Hero Option M5: thumbnail rail of real cutouts in frosted chips, active chip ringed in gold
export function withHeroM5(Component: ComponentType<any>): ComponentType<any> {
    return build("M5")(Component)
}
