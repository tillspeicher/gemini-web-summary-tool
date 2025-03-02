import { Component, For } from "solid-js"

interface Props {
    title: string
    link: string
    highlights: string[]
}

const Card: Component<Props> = (props) => {
    return (
        <div class="p-4 my-2 bg-white shadow rounded">
            <a
                href={props.link}
                target="_blank"
                rel="noopener noreferrer"
                class="font-bold text-lg text-blue-500"
            >
                {props.title}
            </a>
            <ul class="list-disc pl-2">
                <For each={props.highlights}>
                    {(highlight) => <li class="my-1">{highlight}</li>}
                </For>
            </ul>
        </div>
    )
}

export default Card
