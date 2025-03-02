from typing import List, Dict
from pydantic import BaseModel


class SerializableHighlightRange(BaseModel):
    startSelector: str
    startOffset: int
    endSelector: str
    endOffset: int


class MdHighlightRange(BaseModel):
    startOffset: int
    endOffset: int


class HighlightRange(BaseModel):
    text: str
    serializableRange: SerializableHighlightRange
    mdRange: MdHighlightRange


class TextHighlight(BaseModel):
    id: int | None
    ranges: List[HighlightRange]


class WebsiteData(BaseModel):
    url: str
    title: str
    contentMd: str | None = None
    highlights: List[TextHighlight] = []


website_data: Dict[str, WebsiteData] = {}  # indexed by URL


class Revision(BaseModel):
    title: str
    content: str


# TODO: include the sources that were used
class AssistantRevision(Revision):
    instruction: str
    preamble: str | None
    epilogue: str | None


# TODO: include the timestamp
class TopicViewRevision(BaseModel):
    id: int
    data: Revision | AssistantRevision


class TopicView(BaseModel):
    id: int
    revisions: List[TopicViewRevision]


class Topic(BaseModel):
    id: int
    name: str
    views: List[TopicView]


class Source(BaseModel):
    url: str
    title: str
    highlights: List[str]


topic_data: Dict[int, Topic] = {
    0: Topic(
        id=0,
        name="Default Topic",
        views=[],
    )
}
