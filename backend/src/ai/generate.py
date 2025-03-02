import os
from typing import List, AsyncGenerator

from google import genai
from google.genai.types import (
    GenerateContentConfig,
)
from fastapi import HTTPException, status
from pydantic import BaseModel

from data import (
    TextHighlight,
    WebsiteData,
    AssistantRevision,
)


class ResponseFormat(BaseModel):
    preamble: str | None
    title: str
    content: str
    epilogue: str | None


SOURCE_TEMPLATE = (
    "<document>\n---\ntitle: {title}\nurl: {url}\n---\n{content}\n</document>"
)
PROMPT_TEMPLATE = "Source documents:\n{sources}\n\nInstruction:\n{instruction}"

SYSTEM_PROMPT_EXAMPLE = {
    "title": "Document title",
    "url": "https://example.com",
    "content": "# Document title\nSome <highlight-1>highlighted text</highlight-1> in the document.\n<highlight-2>More important</highlight-2> text.",
}
SYSTEM_PROMPT = f"""
You are a research assistant.
You are presented with a list of source documents in Markdown format, along with highlighted portions of text.
Each source document is sourrounded by `<document>\n---\n(metadata)\n---\n...Markdown text...</document>` tags.
Each highlight is formatted using the syntax `<highlight-x>...text...</highlight-1>` where `x` is the highlight ID. Highlights can overlap.
Highlights are parts of the document that are especially important to the user and should be emphasized in the response.
Documents may be converted from HTML and may contain irrelevant information such as ads or banners. Ignore those and focus on the key theme of each document!

Your task is to produce a response that answers the user's instruction concisely, correctly, and including all relevant information.
The response's main content and the rest of your answer should be based on the source documents and put special emphasis on the highlighted portions of text.
Your answer should be in JSON format with the following schema: `{ResponseFormat.model_json_schema()}`.
The text in each field should be formatted as Markdown, except for the `title` field which should be a concise discription of the artifact in a few words.
The `content` field should only contain the concise answer to the user's request, such as a summary, a list of most important takeaways, etc.
It should not contain any rationale or explanation of the content, those can be included in the `preamble` or `epilogue` fields.
E.g. it should not start with "Here is a summary of ...: The document contains ...", but rather "The document contains ...".

An interaction will look as follows:

Source documents:
{SOURCE_TEMPLATE.format(**SYSTEM_PROMPT_EXAMPLE)}

Instruction:
Summarize the sources.

Response:
{ResponseFormat(
    preamble="A summary of the sources (optional)",
    title="Summary",
    content="The summary. Be concise here, no rationales!",
    epilogue="An explanation or something else (optional)",
).model_dump_json()}
"""

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-2.0-flash"
# MODEL = "gemini-1.5-pro-002"
GENERATION_CONFIG = GenerateContentConfig(
    system_instruction=SYSTEM_PROMPT,
    response_mime_type="application/json",
    response_schema=ResponseFormat,
)

client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_view_revision_stream(
    sources: List[WebsiteData],
    instruction: str,
) -> AsyncGenerator[str | AssistantRevision, None]:
    prompt = PROMPT_TEMPLATE.format(
        sources=format_sources(sources),
        instruction=instruction,
    )

    # Stream the raw response first
    buffer = ""
    async for chunk in generate_response_stream(prompt):
        buffer += chunk
        yield chunk

    # Parse the complete response once done
    try:
        assistant_response = ResponseFormat.model_validate_json(buffer)
        yield AssistantRevision(
            title=assistant_response.title,
            content=assistant_response.content,
            instruction=instruction,
            preamble=assistant_response.preamble,
            epilogue=assistant_response.epilogue,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse response: {str(e)}",
        )


def format_sources(sources: List[WebsiteData]) -> str:
    formatted_sources = []
    for source in sources:
        assert source.contentMd is not None
        source_content = insert_highlight_markers(
            source.contentMd, source.highlights
        )
        formatted_sources.append(
            SOURCE_TEMPLATE.format(
                title=source.title,
                url=source.url,
                content=source_content,
            )
        )
    return "\n".join(formatted_sources)


def insert_highlight_markers(
    content: str, highlights: List[TextHighlight]
) -> str:
    """
    Insert highlight markers into text at specified ranges.
    Handles overlapping highlights by properly nesting the markers.

    Args:
        content: The original text content
        highlights: List of highlight ranges to insert

    Returns:
        String with highlight markers inserted
    """
    # Create events for starts and ends of highlights
    events = []  # (position, type, highlight_id, range_index)
    for highlight in highlights:
        for i, range in enumerate(
            [range.mdRange for range in highlight.ranges], 1
        ):
            events.append((range.startOffset, "start", highlight.id, i))
            events.append((range.endOffset, "end", highlight.id, i))

    # Sort events by position, handling special cases:
    # 1. For same position, end comes before start
    # 2. For same position and type, lower index comes first
    # 3. For multiple ranges for the same highlight, lower indices come first
    events.sort(key=lambda x: (x[0], 0 if x[1] == "end" else 1, x[2], x[3]))

    # Build the result string
    result = []
    current_pos = 0

    for pos, event_type, highlight_id, _ in events:
        # Add text before the current position
        result.append(content[current_pos:pos])

        # Add the appropriate marker
        if event_type == "start":
            result.append(f"<highlight-{highlight_id}>")
        else:
            result.append(f"</highlight-{highlight_id}>")

        current_pos = pos

    # Add remaining text
    result.append(content[current_pos:])

    return "".join(result)


async def generate_response_stream(prompt: str):
    response_stream = await client.aio.models.generate_content_stream(
        model=MODEL, contents=prompt, config=GENERATION_CONFIG
    )

    async for chunk in response_stream:
        if chunk.text is not None:
            yield chunk.text
