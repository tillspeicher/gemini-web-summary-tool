import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.sources import router as sources_router
from api.topics import router as topics_router


app = FastAPI()
app.include_router(sources_router, prefix="/api/v1/sources")
app.include_router(topics_router, prefix="/api/v1/topics")

# CORS configuration
origins = [
    "http://localhost:3000",  # Frontend during development
    "http://localhost:3010",  # Browser extension
    # Add production domain
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
