# Gemini Web Summary Tool

## How to run it?

See the `README.md` files in the `backend`, `browser_extension` and `frontend` directories for instructions on how to setup and start the respective component.
You need to start all three to use the tool.

## What problem do we address?

- When doing research on the web you often encounter a lot of information, some of which is relevant, most of which is quickly forgotten. E.g. what specs did that really nice laptop have again? What library did that project use to implement agentic workflows? What was great-looking tour summiting Mont Blanc?
- Do deal with the deluge of data and make the connection between your current self reading a useful piece of information, and your future self needing it to act on it, you currently have two choices: 1) go through the hassle of bookmarking/webclipping/manually saving the information and storing it in the right location, which comes with a lot of temporal and cognitive overhead, or 2) don't bother with it and just hope you will somehow recall later what it was and where you saw it, which is pretty lossy.
- Ideally you want to store the information and its source so that its very easy to retrieve and act upon later, while not spending any extra effort capturing it.

## What did we build to solve the problem?

- a browser extension to highlight and remember important parts of websites
- a webapp to 1) list the websites and their highlighted portions, and to 2) create summaries and reports of them using an AI-assistant

## How did we build it?

- Main ingredients
  - browser extension: SolidJS, tailwindcss, typescript, WXT, rehype, remark
  - frontend: SolidJS, tailwindcss, typescript
  - backend: FastAPI, Vertex AI (Gemini)
- When the user highlights text on the website, the browser extension
  - adds a highlight marker to the DOM
  - parses the DOM using rehype
  - removes unnecessary parts of the DOM, e.g. the navbar and header
  - renders the website content as Markdown, with annotations for the highlighted portions
  - saves the converted content along with highlight information to the backend
- In the frontend:
  - websites and their highlighted portions are shown.
  - users can create views with custom instructions to summarize or extract useful information from the highlighted sources.
- The backend
  - uses websockets to sync new annotations from the browser extension to the frontend.
  - creates the view content by using website sources with highlight markers as context for the user instruction, feeding the augmented prompt to Gemini 2.0 Flash using Vertex AI, and sending the responses back to the frontend.

## What is the current status?

- Early prototype
- Things that are working:
  - basic highlighting and storing highlights and website content to the backend
  - aggregating website data with highlights markers as prompt context
  - generating view content by prompting Gemini 2.0 Flash with the context + instructions
- Things that are missing:
  - Persistence: after restarting the backend, everything is reset
  - More robust highlights: currently, only highlights spanning a single DOM node are possible, i.e. if you try to select a range containing both normal text and a link, it won't work.
  - Restoring highlight markers when websites are refreshed
  - Update and delete operations for highlights and views
  - More than one user
  - More than one topic per user
  - Streaming model responses to the frontend while they are generated
