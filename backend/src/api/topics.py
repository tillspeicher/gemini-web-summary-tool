from typing import Dict
import uuid

from pydantic import BaseModel
from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from data import (
    Topic,
    TopicView,
    TopicViewRevision,
    Revision,
    topic_data,
    website_data,
)
from ai.generate import generate_view_revision_stream


router = APIRouter()


@router.post("/create_topic_view")
async def create_topic_view(topic_id: int) -> int:
    topic = await load_topic(topic_id)
    view_id = len(topic.views)
    topic.views.append(TopicView(id=view_id, revisions=[]))
    return view_id


class Instruction(BaseModel):
    instruction: str


ongoing_revisions: Dict[int, str] = {}


@router.post("/create_ai_revision", response_model=TopicViewRevision)
async def create_ai_revision(
    topic_id: int,
    view_id: int,
    instruction: Instruction,
) -> TopicViewRevision:
    topic_view = await load_topic_view(topic_id, view_id)
    # TODO: potential race condition
    revision_id = len(topic_view.revisions)

    async for revision_data in generate_view_revision_stream(
        list(website_data.values()),
        instruction.instruction,
    ):
        if isinstance(revision_data, str):
            # We're still generating, store the WIP state
            pass
            # TODO: implement response streaming
        else:
            # We're done, store the final revision
            revision = TopicViewRevision(
                id=revision_id,
                data=revision_data,
            )
            topic_view.revisions.append(revision)
            # return revision
            return revision.model_copy(
                update={
                    "data": Revision(
                        title=revision_data.title,
                        content=revision_data.content,
                    )
                }
            )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Revision generation failed",
    )


revision_subscriptions: Dict[int, uuid.UUID] = {}


@router.get("/topic")
async def get_topic(topic_id: int) -> Topic:
    return await load_topic(topic_id)


async def load_topic_view(topic_id: int, view_id: int) -> TopicView:
    topic = await load_topic(topic_id)
    topic_view = next(
        (view for view in topic.views if view.id == view_id),
        None,
    )
    if topic_view is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No view with id {view_id} in topic with id {topic_id}",
        )
    return topic_view


async def load_topic(topic_id: int) -> Topic:
    topic = topic_data.get(topic_id)
    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No topic with id {topic_id}",
        )
    return topic
