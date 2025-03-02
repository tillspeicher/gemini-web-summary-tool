import { createTopicState, TopicContext } from "~/lib/topicState"
import Header from "~/components/Header"
import ViewArea from "~/components/areas/ViewArea"
import SourceArea from "~/components/areas/SourceArea"

export default function Home() {
    const topicState = createTopicState()
    return (
        <TopicContext.Provider value={topicState}>
            <div class="flex flex-col w-full h-screen text-gray-700">
                <Header />
                <div class="flex flex-row w-full h-full bg-gray-100">
                    <SourceArea />
                    <ViewArea />
                </div>
            </div>
        </TopicContext.Provider>
    )
}
