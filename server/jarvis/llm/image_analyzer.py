from typing import Optional
from openai import AsyncOpenAI
from pipecat.services.llm_service import FunctionCallParams
from pipecat.services.ai_service import AIService
from loguru import logger


class ImageAnalyzer:
    """Analyzes images using an OpenAI-compatible API."""

    def __init__(self, base_url: str, api_key: str, model: str):
        """Initialize the ImageAnalyzer with API credentials.

        Args:
            base_url: The base URL for the OpenAI-compatible API endpoint.
            api_key: The API key for authentication.
        """
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        self._model = model
        self._pic_cache = {}

    def push_image(self, uuid: str, data: str):
        self._pic_cache[uuid] = data 

    async def handle_function_call(self, params: FunctionCallParams):
        """Handle a function call to analyze an image.

        Args:
            params: The function call parameters containing:
                - prompts: The text prompt to send with the image
                - image: The base64-encoded image data
                - result_callback: Callback to return the analysis result
        """
        try:
            prompts = params.arguments.get("prompts", "")
            image_uuid = params.arguments.get("image_uuid", "")

            if not image_uuid:
                await params.result_callback("Error: No image uuid provided")
                return
            
            image_data = self._pic_cache[image_uuid]
            if not image_data:
                await params.result_callback("Error: image uuid not exist")
                return
            
            del self._pic_cache[image_uuid]

            # Prepare the message with image content
            message = {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompts},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ],
            }

            logger.info(f"Calling VL model to analyze photo {image_uuid} with prompt: {prompts}")
            # Call the OpenAI-compatible API for image analysis
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[message],
                max_tokens=1000,
            )

            # Extract the analysis result
            result = response.choices[0].message.content if response.choices else ""
            logger.info(f'Got result: {result}')

            # Return the result via the callback
            await params.result_callback(result)

        except Exception as e:
            # Return any error via the callback
            await params.result_callback(f"Error analyzing image: {str(e)}")