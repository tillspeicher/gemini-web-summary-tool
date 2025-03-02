import { Component, Show, useContext, createSignal } from "solid-js"

import { TopicContext, TopicState, Revision } from "~/lib/topicState"
import { cn } from "~/lib/utils"
import TextView from "./TextView"

interface Props {
    data: Revision
    isSelected: () => boolean
    select: () => void
}

const View: Component<Props> = (props) => {
    const topicState = useContext<TopicState | undefined>(TopicContext)
    const [instruction, setInstruction] = createSignal("")

    async function handleSendMessage() {
        const trimmedInstruction = instruction().trim()
        setInstruction("")
        const selectedViewId = topicState?.selectedViewId() ?? null
        if (!topicState || selectedViewId === null || trimmedInstruction === "")
            return
        await topicState.createAiRevision(selectedViewId, trimmedInstruction)
        setInstruction("")
    }
    return (
        <div
            class={cn(
                "w-full bg-white rounded-lg shadow-sm border border-gray-200",
                {
                    "border-2 border-blue-500": props.isSelected(),
                },
            )}
        >
            <button
                class="w-full p-4 border-b border-gray-200"
                onClick={props.select}
            >
                <h2 class="text-xl font-semibold">{props.data.title}</h2>
            </button>
            <div class="p-4">
                <TextView content={props.data.content} />
            </div>
            <Show when={props.isSelected()}>
                <div class="flex">
                    <textarea
                        class="flex-grow p-2 border rounded-bl-lg resize-none overflow-y-auto focus:border-slate-400"
                        placeholder="Instructions..."
                        rows={1}
                        value={instruction()}
                        onInput={(e) => {
                            const target = e.currentTarget
                            setInstruction(target.value)
                            target.style.height = ""
                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                        }}
                        onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                        }
                    />
                    <button
                        class="w-10 bg-blue-500 text-white p-2 rounded-br-lg"
                        onClick={handleSendMessage}
                    >
                        Go
                    </button>
                </div>
            </Show>
        </div>
    )
}

export default View
