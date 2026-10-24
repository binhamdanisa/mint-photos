import type { CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

// Year display rules:
// 1. Year has a value: show it.
// 2. Year is empty and Included lists papers or a certificate: show "Undated".
// 3. Year is empty and there are no papers: render nothing at all.
export function hasPapers(included: string): boolean {
    return /paper|certificat/i.test(included || "")
}
export function yearText(year: string, included: string): string {
    const y = (year || "").trim()
    if (y) return y
    return hasPapers(included) ? "Undated" : ""
}

const FONT = "'Bricolage Grotesque', sans-serif"
const INK = "rgb(49, 54, 48)"

interface Props {
    year: string
    included: string
    condition: string
    layout: "tile" | "row" | "inline"
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function YearValue(props: Props) {
    const { year = "", included = "", condition = "", layout = "tile", style } = props
    const value = yearText(year, included)

    if (layout === "inline") {
        const parts = [condition && condition.trim(), value].filter(Boolean)
        if (!parts.length) return null
        return <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "rgba(49, 54, 48, 0.6)", whiteSpace: "nowrap", ...style }}>{parts.join(" · ")}</span>
    }
    if (!value) return null
    if (layout === "row") {
        return (
            <div style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(49, 54, 48, 0.08)", fontFamily: FONT, ...style }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1, textTransform: "uppercase", color: "rgba(49, 54, 48, 0.52)" }}>Year</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: INK }}>{value}</span>
            </div>
        )
    }
    return (
        <div style={{ width: "100%", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", borderRadius: 12, background: "#f5f5f7", fontFamily: FONT, ...style }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(49, 54, 48, 0.62)" }}>YEAR</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(29, 29, 31)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{value}</span>
        </div>
    )
}

addPropertyControls(YearValue, {
    year: { type: ControlType.String, title: "Year", defaultValue: "" },
    included: { type: ControlType.String, title: "Included", defaultValue: "" },
    condition: { type: ControlType.String, title: "Condition", defaultValue: "" },
    layout: { type: ControlType.Enum, title: "Layout", options: ["tile", "row", "inline"], optionTitles: ["Tile", "Row", "Inline"], defaultValue: "tile" },
})
