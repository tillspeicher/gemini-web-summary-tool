import { Component, For, useContext } from "solid-js"

import { TopicContext, TopicState } from "~/lib/topicState"
import Card from "~/components/Card"

interface Props {}

const SourceArea: Component<Props> = () => {
    const topicState = useContext<TopicState | undefined>(TopicContext)
    return (
        <aside class="w-1/4 max-w-100 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <h2 class="text-lg font-semibold mb-4">Sources</h2>
            <ul class="space-y-4">
                <For each={topicState?.topic.sources}>
                    {(source) => (
                        <Card
                            title={source.title}
                            link={source.link}
                            highlights={source.highlights}
                        />
                    )}
                </For>
            </ul>
        </aside>
    )
}

export default SourceArea
