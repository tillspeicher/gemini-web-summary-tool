export interface SelectionRange {
    left: number
    bottom: number
}

const HighlightButton = (props: {
    onClick: () => void
    selection: () => SelectionRange | null
}) => {
    const selectionRange = props.selection

    return (
        <button
            id="selection-button"
            onClick={props.onClick}
            style={{
                position: "absolute",
                "z-index": 500,
                padding: "5px 10px",
                background: "#007bff",
                color: "white",
                border: "none",
                "border-radius": "3px",
                cursor: "pointer",
                display: selectionRange() ? "block" : "none",
                left: selectionRange()
                    ? `${selectionRange().left + window.scrollX}px`
                    : "0px",
                top: selectionRange()
                    ? `${selectionRange().bottom + window.scrollY + 5}px`
                    : "0px",
                // ...buttonStyle,
                // ...props.style,
            }}
        >
            Remember
        </button>
    )
}

export function toSelectionRange(
    selection: Selection | null,
): SelectionRange | null {
    if (
        !selection ||
        selection.rangeCount === 0 ||
        selection.toString().trim().length == 0
    )
        return null
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    return {
        left: rect.left,
        bottom: rect.bottom,
    }
}

export default HighlightButton
