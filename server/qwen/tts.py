from loguru import logger
from pipecat.services.ai_service import AIService
from pipecat.frames.frames import TextFrame, LLMFullResponseStartFrame, LLMFullResponseEndFrame, TTSAudioRawFrame, TTSStartedFrame, TTSStoppedFrame, InterimTranscriptionFrame, TranscriptionFrame

import dashscope
from dashscope.audio.qwen_tts_realtime import *
import base64
import asyncio

class QwenTTSCallback(QwenTtsRealtimeCallback):
    def __init__(self, service: 'QwenTTSService'):
        self.service = service
        self.loop = asyncio.get_running_loop()

    def on_open(self):
        logger.info('TTS session opened')
    
    def on_close(self, close_status_code, close_msg):
        logger.info(f'TTS session closed with code {close_status_code} msg {close_msg}')
    
    def on_event(self, message):
        event_type = message['type']
        logger.info(f'TTS event: {event_type}')
        match event_type:
            case 'session.created':
                pass
            case 'response.created':
                asyncio.run_coroutine_threadsafe(self.service.push_frame(TTSStartedFrame()), self.loop)
            case 'response.audio.delta':
                audio_b64 = message['delta']
                audio_bytes = base64.b64decode(audio_b64)
                logger.info(f'TTS audio delta {len(audio_bytes)} bytes')
                asyncio.run_coroutine_threadsafe(self.service.push_frame(TTSAudioRawFrame(
                    audio=audio_bytes,
                    sample_rate=24000,
                    num_channels=1,
                )), self.loop)
                pass
            case 'response.done':
                asyncio.run_coroutine_threadsafe(self.service.push_frame(TTSStoppedFrame()), self.loop)
            case 'session.finished':
                self.service.tts.close()

class QwenTTSService(AIService):
    def __init__(
            self,
            api_key,
            model='qwen3-tts-flash-realtime',
            base_url='wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
            **kwargs
        ):
        super().__init__(**kwargs)
        self.base_url = base_url
        self.model = model
        self.api_key = api_key
    
    async def start(self, frame):
        await super().start(frame)
        dashscope.api_key = self.api_key
        self.callback = QwenTTSCallback(self)
        self.tts = QwenTtsRealtime(
            model=self.model,
            callback=self.callback,
            url=self.base_url,
        )

    async def stop(self, frame):
        await super().stop(frame)
        self.callback = None
        self.tts = None
    
    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        if (
            isinstance(frame, TextFrame)
            and not isinstance(frame, InterimTranscriptionFrame)
            and not isinstance(frame, TranscriptionFrame)
        ):
            logger.info('Received TextFrame')
            await self._send_text(frame)
        elif isinstance(frame, LLMFullResponseStartFrame):
            logger.info('Received LLMFullResponseStartFrame')
            await self._start_tts(frame)
        elif isinstance(frame, LLMFullResponseEndFrame):
            logger.info('Received LLMFullResponseEndFrame')
            await self._stop_tts(frame)
        await self.push_frame(frame, direction)

    async def _start_tts(self, frame: LLMFullResponseStartFrame):
        logger.info('Starting TTS')
        self.tts.connect()
        self.tts.update_session(
            voice='Cherry',
            response_format=AudioFormat.PCM_24000HZ_MONO_16BIT,
            mode='server_commit'
        )

    async def _stop_tts(self, frame: LLMFullResponseEndFrame):
        logger.info('Stopping TTS')
        self.tts.finish()

    async def _send_text(self, frame: TextFrame):
        logger.info(f'Sending text {frame.text} to TTS')
        self.tts.append_text(frame.text)