import { makeApiCall } from "./backgroundCommunication"
import { MDHighlightRange } from "./domSerialization"

type SerializableHighlightRange = {
    startSelector: string
    startOffset: number
    endSelector: string
    endOffset: number
}

type HighlightRange = {
    id: number // Locally assigned ID
    text: string
    range: Range
    serializableRange: SerializableHighlightRange
    mdStartOffset?: number
    mdRange?: MDHighlightRange
}

export type Highlight = {
    id: number | null
    ranges: HighlightRange[]
}

type ServerHighlight = {
    id: number | null
    ranges: Omit<HighlightRange, "id" | "range">[]
}

let curHighlightRangeId = 0

export function createHighlight(selection: Selection): Highlight | null {
    const ranges: HighlightRange[] = []
    for (let rangeIdx = 0; rangeIdx < selection.rangeCount; rangeIdx++) {
        const range = selection.getRangeAt(rangeIdx)
        const selectedText = range.toString().trim()
        if (selectedText.length === 0) continue

        const startNode = range.startContainer
        const startNodeSelector = getUniqueSelector(startNode)
        const endNode = range.endContainer
        const endNodeSelector = getUniqueSelector(endNode)

        const serializableRange: SerializableHighlightRange = {
            startSelector: startNodeSelector,
            startOffset: range.startOffset,
            endSelector: endNodeSelector,
            endOffset: range.endOffset,
        }
        const highlightRange: HighlightRange = {
            id: curHighlightRangeId++,
            text: selectedText,
            range,
            serializableRange,
        }
        ranges.push(highlightRange)
    }

    if (ranges.length === 0) {
        return null
    }
    return {
        id: null,
        ranges,
    }
}

const HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.5)" // Transparent yellow

export function showHighlight(highlight: Highlight) {
    for (const highlightRange of highlight.ranges) {
        const span = document.createElement("span")
        span.setAttribute("data-highlight-id", highlightRange.id.toString())
        span.style.backgroundColor = HIGHLIGHT_COLOR
        highlightRange.range.surroundContents(span)
    }
}

export function updateHighlightMdPositions(
    highlights: Highlight[],
    markerPositions: Map<number, MDHighlightRange>,
): Highlight[] {
    const changedHighlights = []
    for (const highlight of highlights) {
        for (const highlightRange of highlight.ranges) {
            const rangeMdPosition = markerPositions.get(highlightRange.id)
            if (!rangeMdPosition) {
                console.error(
                    `No MD position found for highlight range ${highlightRange.id}`,
                )
                continue
            }
            if (
                highlightRange.mdRange?.startOffset !==
                    rangeMdPosition.startOffset ||
                highlightRange.mdRange?.endOffset !== rangeMdPosition.endOffset
            ) {
                // The MD position (and maybe the rest of the highlight)
                // changed, update
                highlightRange.mdRange = rangeMdPosition
                changedHighlights.push(highlight)
            }
        }
    }
    return changedHighlights
}

export async function saveHighlights(highlights: Highlight[]): Promise<void> {
    const url = window.location.href
    const title = document.title
    const serverHighlights: ServerHighlight[] = highlights.map((highlight) => ({
        id: highlight.id,
        ranges: highlight.ranges.map((highlightRange) => ({
            text: highlightRange.text,
            serializableRange: highlightRange.serializableRange,
            mdRange: highlightRange.mdRange,
        })),
    }))

    try {
        const response = await makeApiCall({
            url_postfix: `/sources/save_highlights`,
            method: "POST",
            data: {
                url: url,
                title: title,
                highlights: serverHighlights,
            },
        })

        const highlightIds = response.highlightIds
        if (highlightIds === undefined) {
            throw new Error("Failed to send data: " + response.statusText)
        }

        if (highlightIds.length !== highlights.length) {
            throw new Error(
                `Mismatch between number of highlights and highlight IDs: ${highlightIds.length} vs ${highlights.length}`,
            )
        }
        for (let i = 0; i < highlights.length; i++) {
            const highlight = highlights[i]
            const highlightId = highlightIds[i]
            highlight.id = highlightId
        }
    } catch (error) {
        console.error("Error saving highlight:", error)
    }
}

function getUniquePath(node: Node): string[] {
    const indexPath: string[] = []
    let curNode = node
    while (curNode.parentNode) {
        const parent = curNode.parentNode
        const nodeIdx = Array.from(parent.childNodes).indexOf(
            curNode as ChildNode,
        )
        indexPath.push(String(nodeIdx))
        curNode = parent
    }
    return indexPath
}

function getUniqueSelector(node: Node): string {
    const pathElements = getUniquePath(node)
    const path = "/" + pathElements.reverse().join("/")
    return path
}
