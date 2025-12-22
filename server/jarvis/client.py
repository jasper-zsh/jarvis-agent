from pipecat.services.ai_service import AIService
from pipecat.frames.frames import OutputTransportMessageUrgentFrame

class RegisterClientSideToolsFrame(OutputTransportMessageUrgentFrame):
    def __init__(self):
        super().__init__({})

class ClientSideTools(AIService):
    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        await self.push_frame(frame, direction)

        