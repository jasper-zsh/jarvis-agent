import argparse
import sys
from contextlib import asynccontextmanager

from bot import bot
from dotenv import load_dotenv
from typing import TypedDict

from loguru import logger
from fastapi import FastAPI, BackgroundTasks, Request
import uvicorn
from pipecat.transports.smallwebrtc.request_handler import (
    SmallWebRTCRequest,
    SmallWebRTCPatchRequest,
    SmallWebRTCRequestHandler,
)
from pipecat.runner.types import SmallWebRTCRunnerArguments
import uuid

load_dotenv(override=True)

app = FastAPI()

small_webrtc_handler: SmallWebRTCRequestHandler = SmallWebRTCRequestHandler()

class StartBotResult(TypedDict, total=False):
    sessionId: str

@app.post("/start")
async def start(request: Request):
    session_id = str(uuid.uuid4())
    result: StartBotResult = {
        "sessionId": session_id,
    }

    return result
    

@app.post('/sessions/{session_id}/api/offer')
async def offer(session_id: str, request: SmallWebRTCRequest, background_tasks: BackgroundTasks):
    async def webrtc_connection_callback(connection):
        runner_args = SmallWebRTCRunnerArguments(
            connection,
            body=request.request_data,
        )

        background_tasks.add_task(bot, runner_args)
    
    answer = await small_webrtc_handler.handle_web_request(request, webrtc_connection_callback)
    return answer

@app.patch('/sessions/{session_id}/api/offer')
async def ice_candidate(session_id: str, request: SmallWebRTCPatchRequest):
    await small_webrtc_handler.handle_patch_request(request)
    return {"status": "success"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await small_webrtc_handler.close()

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