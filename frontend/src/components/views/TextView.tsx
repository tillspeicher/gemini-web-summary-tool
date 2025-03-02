import { Component, createEffect, createSignal } from "solid-js"
import { marked } from "marked"

interface Props {
    content: string
}

const TextView: Component<Props> = (props) => {
    const [htmlContent, setHtmlContent] = createSignal("")

    const parsedHTML = marked.parse(props.content) as string
    createEffect(() => {
        setHtmlContent(parsedHTML)
    })

    return <div innerHTML={htmlContent()} />
}

export default TextView
