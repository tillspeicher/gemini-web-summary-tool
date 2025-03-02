from typing import List
from pydantic import BaseModel
from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    status,
)

from data import (
    TextHighlight,
    WebsiteData,
    website_data,
    Source,
)
from .websockets import manager
from ai.generate import (
    insert_highlight_markers,
)


router = APIRouter()


class WebsiteContent(BaseModel):
    url: str
    title: str
    content: str


@router.post("/save_website_content")
async def save_website(data: WebsiteContent):
    global website_data
    website = website_data.get(data.url)
    if website is None:
        website = WebsiteData(
            url=data.url, title=data.title, contentMd=data.content
        )
        website_data[data.url] = website
    else:
        website.contentMd = data.content


@router.get("/website_content", response_model=str)
async def get_website(url: str) -> str:
    website = await load_website(url)
    assert website.contentMd is not None
    return website.contentMd


@router.get("/website_content_markers")
async def get_website_content_markers(url: str) -> str:
    """Get the website data as Markdown with annotated marker positions"""
    website = await load_website(url)
    content = website.contentMd
    assert content is not None
    # Splice highlight markers into the content
    return insert_highlight_markers(content, website.highlights)


async def load_website(url: str) -> WebsiteData:
    global website_data
    website = website_data.get(url)
    if website is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Website not found"
        )
    if website.contentMd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website has no content",
        )
    return website


class TextHighlightResponse(BaseModel):
    highlightIds: List[int]


class HighlightsData(BaseModel):
    url: str
    title: str
    highlights: List[TextHighlight]


highlight_id = 0


@router.post("/save_highlights", response_model=TextHighlightResponse)
async def save_highlights(data: HighlightsData):
    global highlight_id

    website = website_data.get(data.url)
    if website is None:
        website = WebsiteData(url=data.url, title=data.title)
        website_data[data.url] = website

    highlight_ids = []
    for highlight in data.highlights:
        highlight.id = highlight_id
        highlight_ids.append(highlight_id)
        highlight_id += 1
        website.highlights.append(highlight)

    await notify_updates()

    return TextHighlightResponse(highlightIds=highlight_ids)


@router.websocket("/subscribe")
async def websocket_endpoint(websocket: WebSocket):
    connection_id = await manager.connect(websocket)
    await notify_updates()

    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(connection_id)


class SourcesData(BaseModel):
    sources: List[Source]


# A utility function to notify clients of updates
async def notify_updates():
    source_data = SourcesData(
        sources=[
            Source(
                url=website.url,
                title=website.title,
                highlights=[
                    "...".join(range.text for range in highlight.ranges)
                    for highlight in website.highlights
                ],
            )
            for website in website_data.values()
        ]
    )
    update_message = {"type": "update", "sources": source_data.model_dump()}
    await manager.broadcast(update_message)
