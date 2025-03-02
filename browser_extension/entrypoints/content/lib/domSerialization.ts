import { unified } from "unified"
import { Node as UnistNode } from "unist"
import { Element } from "hast"
import rehypeDomParse from "rehype-dom-parse"
import { visit } from "unist-util-visit"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeRemark from "rehype-remark"
import remarkGfm from "remark-gfm"
import remarkStringify from "remark-stringify"

import { makeApiCall } from "./backgroundCommunication"

const HIGHLIGHT_PROPERTY = "dataHighlightId"
const SUPPORTED_ATTRIBUTES = {
    // ...defaultSchema.attributes,
    a: ["href"],
    "*": ["id", HIGHLIGHT_PROPERTY],
}
const UNSUPPORTED_ELEMENTS = [
    "script",
    "style",
    "noscript",
    "template",
    "nav",
    "footer",
    "img",
]
console.log("unsupported elements:", UNSUPPORTED_ELEMENTS)
const SANITIZE_SCHEMA = {
    ...defaultSchema,
    allowComments: false,
    allowDoctypes: false,
    attributes: SUPPORTED_ATTRIBUTES,
    strip: UNSUPPORTED_ELEMENTS,
    // tagNames: SUPPORTED_TAGS,
}

function logNode() {
    return function (tree: UnistNode) {
        visit(tree, (node: UnistNode) => {
            if (node.type === "root") {
                console.log("node:", node)
            }
        })
    }
}

export type MDHighlightRange = {
    startOffset: number
    endOffset: number
}

export async function htmlToMarkdown(): Promise<string> {
    const content = document.body.outerHTML
    const serializedContent = await unified()
        .use(rehypeDomParse, { fragment: true })
        .use(rehypeSanitize, SANITIZE_SCHEMA)
        .use(rehypeRemark, {
            handlers: {
                span(state, node) {
                    return handleHighlight(state, node)
                },
            },
        })
        .use(logNode)
        .use(remarkGfm)
        .use(logNode)
        .use(remarkStringify)
        .process(content)
    console.log("serializedContent:", serializedContent.toString())
    return serializedContent.toString()
}

const highlightMarker = (id: number | string, start: boolean) =>
    `<<highlight-${id}-${start ? "start" : "end"}>>`

/**
 * Insert markers as HTML elements into the converted markdown, to avoid
 * them being formatted weirdly by the stringify operation.
 * Based on:
 * https://github.com/rehypejs/rehype-remark?tab=readme-ov-file#eample-keeping-some-html
 */
function handleHighlight(state: any, node: Element) {
    const highlightId = node.properties?.[HIGHLIGHT_PROPERTY] as string
    if (!highlightId) {
        return state.all(node)
    }

    // Create markers that won't be escaped
    const startMarker = {
        type: "html",
        value: highlightMarker(highlightId, true),
    }
    const endMarker = {
        type: "html",
        value: highlightMarker(highlightId, false),
    }
    return [startMarker, ...state.all(node), endMarker]
}

/**
 * Extracts the highlight markers from the serialized content and returns the
 * content without the markers and a map of highlight IDs to their
 * start and end offsets in ther serialized markdown string.
 */
export function extractHighlightMarkers(
    serializedContent: string,
): [string, Map<number, MDHighlightRange>] {
    const markers = new Map<number, MDHighlightRange>()
    const markerRegex = /<<highlight-(\d+)-(start|end)>>/g
    let match
    let curContent = serializedContent
    while ((match = markerRegex.exec(curContent))) {
        const id = parseInt(match[1])
        const start = match[2] === "start"
        const offset = match.index
        // Remove the marker from the serialized content, so that it
        // doesn't affect the position of subsequent markers
        curContent = curContent.replace(match[0], "")
        // Reset the lastIndex, which points to the end of the match
        // to the beginning, since we remove the match
        markerRegex.lastIndex = offset

        let marker = markers.get(id)
        if (marker === undefined) {
            marker = { startOffset: -1, endOffset: -1 }
            markers.set(id, marker)
        }
        if (start) {
            marker.startOffset = offset
        } else {
            marker.endOffset = offset
        }
    }
    return [curContent, markers]
}

export async function saveMdContent(mdContent: string): Promise<void> {
    const url = window.location.href
    const title = document.title

    try {
        const response = await makeApiCall({
            url_postfix: `/sources/save_website_content`,
            method: "POST",
            data: { url, title, content: mdContent },
        })
    } catch (error) {
        console.error("Error saving page's MD content:", error)
    }
}
