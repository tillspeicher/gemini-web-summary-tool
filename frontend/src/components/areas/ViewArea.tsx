import { For, useContext } from "solid-js"

import { Revision, TopicContext, TopicState } from "~/lib/topicState"
import View from "~/components/views/View"

export default function ViewArea() {
    const topicState = useContext<TopicState | undefined>(TopicContext)
    const currentViewData = () =>
        topicState?.topic.views
            // ?.filter((view) => view.revisions.length > 0)
            .map((view) => {
                let data: Revision
                if (view.revisions.length === 0) {
                    // Placeholder for new view
                    data = {
                        title: "New View",
                        content: "Ask the model to generate content.",
                    }
                } else {
                    data = view.revisions[view.revisions.length - 1].data
                }
                return {
                    data,
                    isSelected: () => view.id === topicState?.selectedViewId(),
                    select: () => topicState?.selectView(view.id),
                }
            })

    return (
        <main class="flex flex-col items-center flex-1 overflow-y-auto p-6 h-full">
            <div class="max-w-4xl w-full space-y-6 flex flex-col items-center">
                <For each={currentViewData() ?? []}>
                    {(view) => <View {...view} />}
                </For>
                <button
                    class="w-20 h-10 bg-gray-300 rounded-lg text-2xl"
                    onClick={() => topicState?.createView()}
                >
                    +
                </button>
            </div>
        </main>
    )
}
