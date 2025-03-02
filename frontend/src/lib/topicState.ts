import { createEffect, onCleanup, createContext, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import type { SetStoreFunction } from "solid-js/store"

import { get, post } from "./backend"

export type Revision = {
    title: string
    content: string
}
type TopicViewRevision = {
    id: number
    data: Revision
}
type TopicView = {
    id: number
    revisions: TopicViewRevision[]
}

type Source = {
    title: string
    link: string
    highlights: string[]
}

type Topic = {
    id: number
    name: string
    sources: Source[]
    views: TopicView[]
}
type TopicViewHandle = {
    createView: () => Promise<void>
    createAiRevision: (viewId: number, instruction: string) => Promise<void>
}
export type TopicState = {
    topic: Topic
    selectedViewId: () => number | null
    selectView: (viewId: number | null) => void
} & TopicViewHandle

const WS_API_URL = "ws://localhost:8000/api/v1"

export const TopicContext = createContext<TopicState>()

export function createTopicState(): TopicState {
    const [topic, setTopic] = createStore<Topic>({
        id: -1,
        name: "Default Topic",
        sources: [],
        views: [],
    })
    // Initialize the topics from the server
    createEffect(async () => {
        const topicId = 0 // TODO: hardcoded
        const topicPath = `topics/topic?topic_id=${topicId}`
        const topic = await get(topicPath)
        if (topic) {
            setTopic(topic)
        }
        // TODO: handle error
    })
    // TODO: potential race condition between loading topic and sources
    // Anyway the sources should be loaded here and later only deltas

    const [selectedViewId, selectView] = createSignal<number | null>(null)

    manageSources(topic)
    const viewHandle = manageViews(topic, setTopic, selectView)

    return { topic, selectedViewId, selectView, ...viewHandle }
}

function manageSources(topic: Topic) {
    const [sources, setSources] = createStore<Source[]>(topic.sources)

    createEffect(() => {
        const ws = new WebSocket(`${WS_API_URL}/sources/subscribe`)

        ws.onopen = () => {
            console.log("Connected to WebSocket")
        }

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            console.log("Received message:", message)

            if (message.type === "update") {
                setSources(message.sources.sources)
            }
        }

        ws.onclose = () => {
            console.log("WebSocket connection closed")
        }

        ws.onerror = (error) => {
            console.error("WebSocket error:", error)
        }

        // Cleanup on component unmount
        onCleanup(() => {
            ws.close()
        })
    })
}

function manageViews(
    topic: Topic,
    setTopic: SetStoreFunction<Topic>,
    selectView: (viewId: number | null) => void,
): TopicViewHandle {
    async function createView() {
        const createViewPath = `topics/create_topic_view?topic_id=${topic.id}`
        const viewId = await post<number>(createViewPath)
        if (viewId === null) {
            // TODO: handle error
            return
        }
        setTopic("views", topic.views.length, {
            id: viewId,
            revisions: [],
        })
        selectView(viewId)
    }

    async function createAiRevision(viewId: number, instruction: string) {
        const view = topic.views.find((v) => v.id === viewId)
        if (!view) {
            console.error("View not found:", viewId)
            return
        }
        const revisionPath = `topics/create_ai_revision?topic_id=${topic.id}&view_id=${view.id}`
        const revision = await post<TopicViewRevision>(revisionPath, {
            instruction,
        })
        if (!revision) {
            // TODO: handle error
            return
        }
        setTopic(
            "views",
            (v) => v.id === view.id,
            "revisions",
            (revisions) => [...revisions, revision],
        )
    }

    return { createView, createAiRevision }
}
