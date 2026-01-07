import argparse
import sys
from contextlib import asynccontextmanager

from bot import run_bot
from dotenv import load_dotenv
from typing import TypedDict

from loguru import logger
from fastapi import FastAPI, BackgroundTasks, Request, WebSocket
import uvicorn
import uuid

load_dotenv(override=True)

app = FastAPI()

@app.post("/start")
async def start(request: Request):
    return {
        'wsUrl': str(request.url_for('agent'))
    }

@app.websocket('/agent', name='agent')
async def agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection accepted")
    try:
        await run_bot(websocket)
    except Exception as e:
        print(f"Exception in run_bot: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Jarvis Server')
    parser.add_argument(
        "--host", default="localhost", help="Host for HTTP server (default: localhost)"
    )
    parser.add_argument(
        "--port", type=int, default=7860, help="Port for HTTP server (default: 7860)"
    )
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    logger.remove(0)
    if args.verbose:
        logger.add(sys.stderr, level="TRACE")
    else:
        logger.add(sys.stderr, level="DEBUG")

    uvicorn.run(app, host=args.host, port=args.port)