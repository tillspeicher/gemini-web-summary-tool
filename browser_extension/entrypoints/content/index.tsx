import { render } from "solid-js/web"
import { Show, createSignal, createEffect, onCleanup } from "solid-js"

import {
    htmlToMarkdown,
    extractHighlightMarkers,
    saveMdContent,
} from "./lib/domSerialization"
import {
    Highlight,
    createHighlight,
    showHighlight,
    updateHighlightMdPositions,
    saveHighlights,
} from "./lib/highlights"
import HighlightButton, {
    SelectionRange,
    toSelectionRange,
} from "./components/HighlightButton"

export default defineContentScript({
    matches: ["<all_urls>"],
    async main(ctx) {
        const ui = createIntegratedUi(ctx, {
            position: "inline",
            anchor: "body",
            onMount: (container) => {
                render(() => <App />, container)
            },
            onRemove: (unmount) => {
                unmount?.()
            },
        })

        ui.mount()
    },
})

function App() {
    const [selection, setSelection] = createSignal<SelectionRange | null>(null)
    const [selectionShown, setSelectionShown] = createSignal(false)
    const [pageMdContent, setPageMdContent] = createSignal<string | null>(null)
    const [highlights, setHighlights] = createSignal<Highlight[]>([])

    const handleSelection = () => {
        const selection = window.getSelection()
        setSelection(toSelectionRange(selection))
        setSelectionShown((selection?.rangeCount ?? 0) > 0)
    }

    async function highlightSelection() {
        const selection = window.getSelection()
        if (!selection) return
        const highlight = createHighlight(selection)
        if (!highlight) return
        showHighlight(highlight)
        selection.removeAllRanges() // Clear the selection after highlighting
        setSelectionShown(false)
        const newHighlights = [...highlights(), highlight]

        const mdContentWithMarkers = await htmlToMarkdown()
        const [newMdContent, makers] =
            extractHighlightMarkers(mdContentWithMarkers)
        const differentHighlights = updateHighlightMdPositions(
            newHighlights,
            makers,
        )

        if (pageMdContent() !== newMdContent) {
            setPageMdContent(newMdContent)
            await saveMdContent(newMdContent)
        }
        if (differentHighlights.length > 0) {
            await saveHighlights(differentHighlights)
        }
        // Do this last because saveHighlights() will update the highlights'
        // ids
        setHighlights(newHighlights)
    }

    createEffect(() => {
        document.addEventListener("selectionchange", handleSelection)
        onCleanup(() => {
            document.removeEventListener("selectionchange", handleSelection)
        })
    })

    return (
        <Show when={selection() && selectionShown()}>
            <HighlightButton
                onClick={highlightSelection}
                selection={selection}
            />
        </Show>
    )
}
