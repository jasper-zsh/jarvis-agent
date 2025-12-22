from loguru import logger
import base64

from pipecat.services.stt_service import SegmentedSTTService
from pipecat.frames.frames import AudioRawFrame, LLMMessagesAppendFrame

class LLMVoiceMessageSTT(SegmentedSTTService):
    async def run_stt(self, audio):
        logger.info('convert audio frame to llm message')
        f = LLMMessagesAppendFrame(
            messages=[
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'input_audio',
                            'input_audio': {
                                'data': f'data:;base64,{base64.b64encode(audio).decode()}',
                                'format': 'wav',
                            }
                        }
                    ]
                }
            ],
            run_llm=True,
        )
        yield f
