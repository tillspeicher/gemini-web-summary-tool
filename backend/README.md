## Setup and start

1. Install dependencies with `poetry install`. Optional: Activate the virtual environment with `eval $(poetry env activate)`.
2. Provide your [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key), either by running `export GEMINI_API_KEY=...` or by putting the command into an `.env` file and sourcing it.
3. Start the server with `poetry run fastapi dev src/main.py`.
