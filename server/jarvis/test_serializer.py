"""Unit tests for JSON Frame Serializer."""

import asyncio
import pytest

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    CancelFrame,
    EndFrame,
    FunctionCallInProgressFrame,
    FunctionCallsStartedFrame,
    FunctionCallFromLLM,
    InputAudioRawFrame,
    InputImageRawFrame,
    InputTextRawFrame,
    InterruptionFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMThoughtEndFrame,
    LLMThoughtStartFrame,
    LLMThoughtTextFrame,
    MetricsFrame,
    MetricsData,
    OutputAudioRawFrame,
    OutputImageRawFrame,
    OutputTransportMessageFrame,
    OutputTransportMessageUrgentFrame,
    StartFrame,
    TextFrame,
    TranscriptionFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    UserImageRawFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)

from .serializer import JSONFrameSerializer


@pytest.fixture
def serializer():
    """Create a serializer instance for testing."""
    return JSONFrameSerializer()


@pytest.mark.asyncio
async def test_serializer_type(serializer):
    """Test that serializer returns correct type."""
    from pipecat.serializers.base_serializer import FrameSerializerType

    print(f"\n=== Test: test_serializer_type ===")
    print(f"Serializer type: {serializer.type}")
    print(f"Expected type: {FrameSerializerType.TEXT}")
    print("=" * 50)
    
    assert serializer.type == FrameSerializerType.TEXT


@pytest.mark.asyncio
async def test_serialize_deserialize_text_frame(serializer):
    """Test serialization and deserialization of TextFrame."""
    original = TextFrame(text="Hello, world!")
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    # Output serialized data for demonstration
    print(f"\n=== Serialized {original.__class__.__name__} ===")
    print(json_data)
    print("=" * 50)

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    
    # Output deserialized frame info for demonstration
    print(f"\n=== Deserialized {deserialized.__class__.__name__} ===")
    print(f"Type: {deserialized.__class__.__name__}")
    print(f"Module: {deserialized.__class__.__module__}")
    print("=" * 50)
    
    assert isinstance(deserialized, TextFrame)
    assert deserialized.text == original.text


@pytest.mark.asyncio
async def test_serialize_deserialize_output_audio_frame(serializer):
    """Test serialization and deserialization of OutputAudioRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_output_audio_frame ===")
    
    audio_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 100  # Sample audio
    original = OutputAudioRawFrame(
        audio=audio_data,
        sample_rate=24000,
        num_channels=1,
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Audio data length: {len(original.audio)} bytes")
    print(f"Sample rate: {original.sample_rate}")
    print(f"Channels: {original.num_channels}")
    print(f"Num frames: {original.num_frames}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, OutputAudioRawFrame)
    assert deserialized.audio == original.audio
    assert deserialized.sample_rate == original.sample_rate
    assert deserialized.num_channels == original.num_channels
    assert deserialized.num_frames == original.num_frames
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Audio data preserved: {deserialized.audio == original.audio}")
    print(f"Sample rate preserved: {deserialized.sample_rate == original.sample_rate}")
    print(f"Channels preserved: {deserialized.num_channels == original.num_channels}")
    print(f"Num frames preserved: {deserialized.num_frames == original.num_frames}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_input_audio_frame(serializer):
    """Test serialization and deserialization of InputAudioRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_input_audio_frame ===")
    
    audio_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 100
    original = InputAudioRawFrame(
        audio=audio_data,
        sample_rate=16000,
        num_channels=1,
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Audio data length: {len(original.audio)} bytes")
    print(f"Sample rate: {original.sample_rate}")
    print(f"Channels: {original.num_channels}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, InputAudioRawFrame)
    assert deserialized.audio == original.audio
    assert deserialized.sample_rate == original.sample_rate
    assert deserialized.num_channels == original.num_channels
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Audio data preserved: {deserialized.audio == original.audio}")
    print(f"Sample rate preserved: {deserialized.sample_rate == original.sample_rate}")
    print(f"Channels preserved: {deserialized.num_channels == original.num_channels}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_output_image_frame(serializer):
    """Test serialization and deserialization of OutputImageRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_output_image_frame ===")
    
    image_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 500  # Sample image
    original = OutputImageRawFrame(
        image=image_data,
        size=(640, 480),
        format="RGB",
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Image data length: {len(original.image)} bytes")
    print(f"Size: {original.size}")
    print(f"Format: {original.format}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, OutputImageRawFrame)
    assert deserialized.image == original.image
    assert deserialized.size == original.size
    assert deserialized.format == original.format
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Image data preserved: {deserialized.image == original.image}")
    print(f"Size preserved: {deserialized.size == original.size}")
    print(f"Format preserved: {deserialized.format == original.format}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_input_image_frame(serializer):
    """Test serialization and deserialization of InputImageRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_input_image_frame ===")
    
    image_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 500
    original = InputImageRawFrame(
        image=image_data,
        size=(320, 240),
        format="RGBA",
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Image data length: {len(original.image)} bytes")
    print(f"Size: {original.size}")
    print(f"Format: {original.format}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, InputImageRawFrame)
    assert deserialized.image == original.image
    assert deserialized.size == original.size
    assert deserialized.format == original.format
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Image data preserved: {deserialized.image == original.image}")
    print(f"Size preserved: {deserialized.size == original.size}")
    print(f"Format preserved: {deserialized.format == original.format}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_transcription_frame(serializer):
    """Test serialization and deserialization of TranscriptionFrame."""
    print(f"\n=== Test: test_serialize_deserialize_transcription_frame ===")
    
    original = TranscriptionFrame(
        text="This is a transcription",
        user_id="user123",
        timestamp="2024-01-01T00:00:00Z",
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Text: {original.text}")
    print(f"User ID: {original.user_id}")
    print(f"Timestamp: {original.timestamp}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, TranscriptionFrame)
    assert deserialized.text == original.text
    assert deserialized.user_id == original.user_id
    assert deserialized.timestamp == original.timestamp
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Text preserved: {deserialized.text == original.text}")
    print(f"User ID preserved: {deserialized.user_id == original.user_id}")
    print(f"Timestamp preserved: {deserialized.timestamp == original.timestamp}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_transport_message_frame(serializer):
    """Test serialization and deserialization of OutputTransportMessageFrame."""
    print(f"\n=== Test: test_serialize_deserialize_transport_message_frame ===")
    
    message = {"action": "update", "data": {"key": "value"}}
    original = OutputTransportMessageFrame(message=message)
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Message: {original.message}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, OutputTransportMessageFrame)
    assert deserialized.message == original.message
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Message preserved: {deserialized.message == original.message}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_transport_message_urgent_frame(serializer):
    """Test serialization and deserialization of OutputTransportMessageUrgentFrame."""
    print(f"\n=== Test: test_serialize_deserialize_transport_message_urgent_frame ===")
    
    message = {"action": "urgent", "priority": "high"}
    original = OutputTransportMessageUrgentFrame(message=message)
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Message: {original.message}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, OutputTransportMessageUrgentFrame)
    assert deserialized.message == original.message
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Message preserved: {deserialized.message == original.message}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_input_text_frame(serializer):
    """Test serialization and deserialization of InputTextRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_input_text_frame ===")
    
    original = InputTextRawFrame(text="User input text")
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Text: {original.text}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, InputTextRawFrame)
    assert deserialized.text == original.text
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Text preserved: {deserialized.text == original.text}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_user_image_frame(serializer):
    """Test serialization and deserialization of UserImageRawFrame."""
    print(f"\n=== Test: test_serialize_deserialize_user_image_frame ===")
    
    image_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 500
    original = UserImageRawFrame(
        image=image_data,
        size=(640, 480),
        format="RGB",
        user_id="user456",
        text="User image description",
        append_to_context=True,
    )
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Image data length: {len(original.image)} bytes")
    print(f"Size: {original.size}")
    print(f"Format: {original.format}")
    print(f"User ID: {original.user_id}")
    print(f"Text: {original.text}")
    print(f"Append to context: {original.append_to_context}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, UserImageRawFrame)
    assert deserialized.image == original.image
    assert deserialized.size == original.size
    assert deserialized.format == original.format
    assert deserialized.user_id == original.user_id
    assert deserialized.text == original.text
    assert deserialized.append_to_context == original.append_to_context
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Image data preserved: {deserialized.image == original.image}")
    print(f"Size preserved: {deserialized.size == original.size}")
    print(f"Format preserved: {deserialized.format == original.format}")
    print(f"User ID preserved: {deserialized.user_id == original.user_id}")
    print(f"Text preserved: {deserialized.text == original.text}")
    print(f"Append to context preserved: {deserialized.append_to_context == original.append_to_context}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_llm_thought_frames(serializer):
    """Test serialization and deserialization of LLM thought frames."""
    print(f"\n=== Test: test_serialize_deserialize_llm_thought_frames ===")
    
    # Test LLMThoughtStartFrame
    start_frame = LLMThoughtStartFrame(
        append_to_context=True,
        llm="openai",
    )
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, LLMThoughtStartFrame)
    assert deserialized.append_to_context == start_frame.append_to_context
    assert deserialized.llm == start_frame.llm
    print(f"LLMThoughtStartFrame: append_to_context={deserialized.append_to_context}, llm={deserialized.llm}")

    # Test LLMThoughtTextFrame
    text_frame = LLMThoughtTextFrame(text="Thinking...")
    json_data = await serializer.serialize(text_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, LLMThoughtTextFrame)
    assert deserialized.text == text_frame.text
    print(f"LLMThoughtTextFrame: text={deserialized.text}")

    # Test LLMThoughtEndFrame
    end_frame = LLMThoughtEndFrame(signature="sig123")
    json_data = await serializer.serialize(end_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, LLMThoughtEndFrame)
    assert deserialized.signature == end_frame.signature
    print(f"LLMThoughtEndFrame: signature={deserialized.signature}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_llm_response_frames(serializer):
    """Test serialization and deserialization of LLM response frames."""
    print(f"\n=== Test: test_serialize_deserialize_llm_response_frames ===")
    
    # Test LLMFullResponseStartFrame
    start_frame = LLMFullResponseStartFrame()
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, LLMFullResponseStartFrame)
    print(f"LLMFullResponseStartFrame: successfully serialized and deserialized")

    # Test LLMFullResponseEndFrame
    end_frame = LLMFullResponseEndFrame()
    json_data = await serializer.serialize(end_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, LLMFullResponseEndFrame)
    print(f"LLMFullResponseEndFrame: successfully serialized and deserialized")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_function_call_frames(serializer):
    """Test serialization and deserialization of function call frames."""
    print(f"\n=== Test: test_serialize_deserialize_function_call_frames ===")
    
    # Test FunctionCallsStartedFrame
    function_calls = [
        FunctionCallFromLLM(
            function_name="get_weather",
            tool_call_id="call_123",
            arguments={"location": "New York"},
            context=None,
        )
    ]
    start_frame = FunctionCallsStartedFrame(function_calls=function_calls)
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, FunctionCallsStartedFrame)
    assert len(deserialized.function_calls) == 1
    assert deserialized.function_calls[0].function_name == "get_weather"
    print(f"FunctionCallsStartedFrame: function_calls={len(deserialized.function_calls)}, function_name={deserialized.function_calls[0].function_name}")

    # Test FunctionCallInProgressFrame
    in_progress_frame = FunctionCallInProgressFrame(
        function_name="get_weather",
        tool_call_id="call_123",
        arguments={"location": "New York"},
        cancel_on_interruption=False,
    )
    json_data = await serializer.serialize(in_progress_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, FunctionCallInProgressFrame)
    assert deserialized.function_name == in_progress_frame.function_name
    assert deserialized.tool_call_id == in_progress_frame.tool_call_id
    print(f"FunctionCallInProgressFrame: function_name={deserialized.function_name}, tool_call_id={deserialized.tool_call_id}, cancel_on_interruption={deserialized.cancel_on_interruption}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_tts_frames(serializer):
    """Test serialization and deserialization of TTS frames."""
    print(f"\n=== Test: test_serialize_deserialize_tts_frames ===")
    
    # Test TTSStartedFrame
    start_frame = TTSStartedFrame()
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, TTSStartedFrame)
    print(f"TTSStartedFrame: successfully serialized and deserialized")

    # Test TTSStoppedFrame
    stop_frame = TTSStoppedFrame()
    json_data = await serializer.serialize(stop_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, TTSStoppedFrame)
    print(f"TTSStoppedFrame: successfully serialized and deserialized")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_bot_frames(serializer):
    """Test serialization and deserialization of bot speaking frames."""
    print(f"\n=== Test: test_serialize_deserialize_bot_frames ===")
    
    # Test BotStartedSpeakingFrame
    start_frame = BotStartedSpeakingFrame()
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, BotStartedSpeakingFrame)
    print(f"BotStartedSpeakingFrame: successfully serialized and deserialized")

    # Test BotStoppedSpeakingFrame
    stop_frame = BotStoppedSpeakingFrame()
    json_data = await serializer.serialize(stop_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, BotStoppedSpeakingFrame)
    print(f"BotStoppedSpeakingFrame: successfully serialized and deserialized")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_user_frames(serializer):
    """Test serialization and deserialization of user speaking frames."""
    print(f"\n=== Test: test_serialize_deserialize_user_frames ===")
    
    # Test UserStartedSpeakingFrame
    start_frame = UserStartedSpeakingFrame(emulated=True)
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, UserStartedSpeakingFrame)
    assert deserialized.emulated == start_frame.emulated
    print(f"UserStartedSpeakingFrame: emulated={deserialized.emulated}")

    # Test UserStoppedSpeakingFrame
    stop_frame = UserStoppedSpeakingFrame(emulated=False)
    json_data = await serializer.serialize(stop_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, UserStoppedSpeakingFrame)
    assert deserialized.emulated == stop_frame.emulated
    print(f"UserStoppedSpeakingFrame: emulated={deserialized.emulated}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_control_frames(serializer):
    """Test serialization and deserialization of control frames."""
    print(f"\n=== Test: test_serialize_deserialize_control_frames ===")
    
    # Test StartFrame
    start_frame = StartFrame(
        audio_in_sample_rate=16000,
        audio_out_sample_rate=24000,
        allow_interruptions=True,
    )
    json_data = await serializer.serialize(start_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, StartFrame)
    assert deserialized.audio_in_sample_rate == start_frame.audio_in_sample_rate
    assert deserialized.audio_out_sample_rate == start_frame.audio_out_sample_rate
    assert deserialized.allow_interruptions == start_frame.allow_interruptions
    print(f"StartFrame: audio_in_sample_rate={deserialized.audio_in_sample_rate}, audio_out_sample_rate={deserialized.audio_out_sample_rate}, allow_interruptions={deserialized.allow_interruptions}")

    # Test EndFrame
    end_frame = EndFrame(reason="Test completed")
    json_data = await serializer.serialize(end_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, EndFrame)
    assert deserialized.reason == end_frame.reason
    print(f"EndFrame: reason={deserialized.reason}")

    # Test CancelFrame
    cancel_frame = CancelFrame(reason="Test cancelled")
    json_data = await serializer.serialize(cancel_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, CancelFrame)
    assert deserialized.reason == cancel_frame.reason
    print(f"CancelFrame: reason={deserialized.reason}")

    # Test InterruptionFrame
    interruption_frame = InterruptionFrame()
    json_data = await serializer.serialize(interruption_frame)
    deserialized = await serializer.deserialize(json_data)
    assert isinstance(deserialized, InterruptionFrame)
    print(f"InterruptionFrame: successfully serialized and deserialized")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_metrics_frame(serializer):
    """Test serialization and deserialization of MetricsFrame."""
    print(f"\n=== Test: test_serialize_deserialize_metrics_frame ===")
    
    metrics_data = [
        MetricsData(
            processor="test_processor",
            model="test_model",
        )
    ]
    original = MetricsFrame(data=metrics_data)
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Number of metrics: {len(original.data)}")
    print(f"First metric: processor={original.data[0].processor}, model={original.data[0].model}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, MetricsFrame)
    assert len(deserialized.data) == len(original.data)
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Number of metrics preserved: {len(deserialized.data) == len(original.data)}")
    print(f"First metric preserved: processor={deserialized.data[0].processor}, model={deserialized.data[0].model}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_with_metadata(serializer):
    """Test serialization with frame metadata."""
    print(f"\n=== Test: test_serialize_with_metadata ===")
    
    original = TextFrame(text="Test with metadata")
    original.metadata = {"key1": "value1", "key2": 123}
    original.pts = 1234567890
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Text: {original.text}")
    print(f"Metadata: {original.metadata}")
    print(f"PTS: {original.pts}")

    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert deserialized.metadata == original.metadata
    assert deserialized.pts == original.pts
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Metadata preserved: {deserialized.metadata == original.metadata}")
    print(f"PTS preserved: {deserialized.pts == original.pts}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_with_transport_info(serializer):
    """Test serialization with transport source and destination."""
    print(f"\n=== Test: test_serialize_with_transport_info ===")
    
    original = TextFrame(text="Test with transport info")
    original.transport_source = "input_transport"
    original.transport_destination = "output_transport"
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Text: {original.text}")
    print(f"Transport source: {original.transport_source}")
    print(f"Transport destination: {original.transport_destination}")

    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert deserialized.transport_source == original.transport_source
    assert deserialized.transport_destination == original.transport_destination
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Transport source preserved: {deserialized.transport_source == original.transport_source}")
    print(f"Transport destination preserved: {deserialized.transport_destination == original.transport_destination}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_none_value(serializer):
    """Test serialization returns None for invalid input."""
    print(f"\n=== Test: test_serialize_none_value ===")
    
    result = await serializer.serialize(None)
    print(f"Input: None")
    print(f"Result: {result}")
    print(f"Expected: None")
    assert result is None
    print("Test passed: None input returns None")
    print("=" * 50)


@pytest.mark.asyncio
async def test_deserialize_invalid_json(serializer):
    """Test deserialization returns None for invalid JSON."""
    print(f"\n=== Test: test_deserialize_invalid_json ===")
    
    invalid_json = "{invalid json}"
    result = await serializer.deserialize(invalid_json)
    print(f"Input: {invalid_json}")
    print(f"Result: {result}")
    print(f"Expected: None")
    assert result is None
    print("Test passed: Invalid JSON returns None")
    print("=" * 50)


@pytest.mark.asyncio
async def test_deserialize_empty_string(serializer):
    """Test deserialization returns None for empty string."""
    print(f"\n=== Test: test_deserialize_empty_string ===")
    
    empty_string = ""
    result = await serializer.deserialize(empty_string)
    print(f"Input: '{empty_string}' (empty string)")
    print(f"Result: {result}")
    print(f"Expected: None")
    assert result is None
    print("Test passed: Empty string returns None")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_complex_nested_message(serializer):
    """Test serialization of complex nested message structures."""
    print(f"\n=== Test: test_serialize_complex_nested_message ===")
    
    complex_message = {
        "action": "update",
        "data": {
            "nested": {
                "list": [1, 2, 3],
                "dict": {"key": "value"},
                "string": "test",
            }
        },
        "metadata": {
            "timestamp": 1234567890,
            "tags": ["tag1", "tag2"],
        },
    }
    original = OutputTransportMessageFrame(message=complex_message)
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Message action: {original.message['action']}")
    print(f"Message has nested data: {'nested' in original.message['data']}")
    print(f"Message has metadata: {'metadata' in original.message}")
    print(f"Serialized data length: {len(json_data)} chars")

    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, OutputTransportMessageFrame)
    assert deserialized.message == original.message
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Message preserved: {deserialized.message == original.message}")
    print(f"Complex structure preserved: {deserialized.message['data']['nested']['list'] == [1, 2, 3]}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_roundtrip_preserves_data(serializer):
    """Test that roundtrip serialization preserves all frame data."""
    print(f"\n=== Test: test_roundtrip_preserves_data ===")
    
    test_frames = [
        TextFrame(text="Test text"),
        OutputAudioRawFrame(audio=b"\x00\x01\x02\x03", sample_rate=24000, num_channels=1),
        InputAudioRawFrame(audio=b"\x00\x01\x02\x03", sample_rate=16000, num_channels=1),
        TranscriptionFrame(text="Transcription", user_id="user1", timestamp="2024-01-01T00:00:00Z"),
        StartFrame(audio_in_sample_rate=16000, audio_out_sample_rate=24000),
        EndFrame(reason="Test"),
    ]
    
    print(f"Testing {len(test_frames)} different frame types for roundtrip serialization...")

    for original in test_frames:
        json_data = await serializer.serialize(original)
        assert json_data is not None, f"Failed to serialize {original.__class__.__name__}"

        deserialized = await serializer.deserialize(json_data)
        assert deserialized is not None, f"Failed to deserialize {original.__class__.__name__}"
        assert type(deserialized) == type(original), f"Type mismatch for {original.__class__.__name__}"
        
        print(f"✓ {original.__class__.__name__}: successfully serialized and deserialized")
    
    print(f"All {len(test_frames)} frame types passed roundtrip test")
    print("=" * 50)


@pytest.mark.asyncio
async def test_pipecat_frames_no_module_field(serializer):
    """Test that frames from pipecat.frames.frames don't serialize module field."""
    print(f"\n=== Test: test_pipecat_frames_no_module_field ===")
    
    import json
    
    # Test with various pipecat frame types
    test_frames = [
        TextFrame(text="Test"),
        OutputAudioRawFrame(audio=b"\x00\x01\x02\x03", sample_rate=24000, num_channels=1),
        StartFrame(audio_in_sample_rate=16000, audio_out_sample_rate=24000),
        EndFrame(reason="Test"),
    ]
    
    print(f"Testing {len(test_frames)} frame types for module field absence...")

    for frame in test_frames:
        json_data = await serializer.serialize(frame)
        frame_dict = json.loads(json_data)
        
        # Verify that pipecat.frames.frames frames don't have module field
        assert "module" not in frame_dict, f"{frame.__class__.__name__} should not have module field"
        assert "___type___" in frame_dict, f"{frame.__class__.__name__} should have ___type___ field"
        
        print(f"✓ {frame.__class__.__name__}: module field absent, ___type___ field present")
    
    print(f"All {len(test_frames)} frame types verified correctly")
    print("=" * 50)


# Define custom frame classes at module level for deserialization tests
from dataclasses import dataclass, field
from pipecat.frames.frames import Frame

@dataclass
class CustomStatusFrame(Frame):
    """Custom frame type for status updates."""
    status: str = None
    progress: float = None
    metadata: dict = None
    timestamp: int = None

@dataclass
class CustomDataFrame(Frame):
    """Custom frame type for binary data."""
    name: str = None
    data: bytes = None
    checksum: str = None

@dataclass
class NestedConfig:
    """Nested configuration object."""
    setting1: str = None
    setting2: int = None
    enabled: bool = None

@dataclass
class CustomConfigFrame(Frame):
    """Custom frame type with nested configuration."""
    config_name: str = None
    config: NestedConfig = None
    tags: list = None


@pytest.mark.asyncio
async def test_serialize_deserialize_custom_frame_type(serializer):
    """Test serialization and deserialization of custom frame types."""
    print(f"\n=== Test: test_serialize_deserialize_custom_frame_type ===")
    
    # Create an instance of the custom frame
    original = CustomStatusFrame(
        status="processing",
        progress=0.75,
        metadata={"task_id": "task_123", "user": "john_doe"},
        timestamp=1234567890,
    )
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Module: {original.__class__.__module__}")
    print(f"Status: {original.status}")
    print(f"Progress: {original.progress}")
    print(f"Metadata: {original.metadata}")
    print(f"Timestamp: {original.timestamp}")
    
    # Serialize the custom frame
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Serialized data length: {len(json_data)} chars")
    
    # Verify that the module field is present for custom frames
    import json
    frame_dict = json.loads(json_data)
    assert "module" in frame_dict, "Custom frames should have module field"
    assert "___type___" in frame_dict, "Custom frames should have ___type___ field"
    assert frame_dict["module"] == __name__, f"Module should be {__name__}"
    assert frame_dict["___type___"] == "CustomStatusFrame", "Type should be CustomStatusFrame"
    
    print(f"Module field present: {frame_dict.get('module')}")
    print(f"Type field present: {frame_dict.get('___type___')}")
    
    # Deserialize the custom frame
    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, CustomStatusFrame)
    assert deserialized.status == original.status
    assert deserialized.progress == original.progress
    assert deserialized.metadata == original.metadata
    assert deserialized.timestamp == original.timestamp
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Module: {deserialized.__class__.__module__}")
    print(f"Status preserved: {deserialized.status == original.status}")
    print(f"Progress preserved: {deserialized.progress == original.progress}")
    print(f"Metadata preserved: {deserialized.metadata == original.metadata}")
    print(f"Timestamp preserved: {deserialized.timestamp == original.timestamp}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_custom_frame_with_bytes(serializer):
    """Test serialization and deserialization of custom frame types with bytes data."""
    print(f"\n=== Test: test_serialize_deserialize_custom_frame_with_bytes ===")
    
    # Create an instance with binary data
    binary_data = b"\x00\x01\x02\x03\x04\x05\x06\x07" * 100
    original = CustomDataFrame(
        name="test_data.bin",
        data=binary_data,
        checksum="abc123",
    )
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Name: {original.name}")
    print(f"Data length: {len(original.data)} bytes")
    print(f"Checksum: {original.checksum}")
    
    # Serialize
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Serialized data length: {len(json_data)} chars")
    
    # Deserialize
    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, CustomDataFrame)
    assert deserialized.name == original.name
    assert deserialized.data == original.data
    assert deserialized.checksum == original.checksum
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Name preserved: {deserialized.name == original.name}")
    print(f"Data preserved: {deserialized.data == original.data} ({len(deserialized.data)} bytes)")
    print(f"Checksum preserved: {deserialized.checksum == original.checksum}")
    print("=" * 50)


@pytest.mark.asyncio
async def test_serialize_deserialize_custom_frame_with_nested_objects(serializer):
    """Test serialization and deserialization of custom frame types with nested objects."""
    print(f"\n=== Test: test_serialize_deserialize_custom_frame_with_nested_objects ===")
    
    # Create nested configuration
    nested_config = NestedConfig(
        setting1="value1",
        setting2=42,
        enabled=True,
    )
    
    original = CustomConfigFrame(
        config_name="app_config",
        config=nested_config,
        tags=["tag1", "tag2", "tag3"],
    )
    
    print(f"Original frame: {original.__class__.__name__}")
    print(f"Config name: {original.config_name}")
    print(f"Nested config: setting1={original.config.setting1}, setting2={original.config.setting2}, enabled={original.config.enabled}")
    print(f"Tags: {original.tags}")
    
    # Serialize
    json_data = await serializer.serialize(original)
    assert json_data is not None
    
    print(f"Serialized data length: {len(json_data)} chars")
    
    # Deserialize
    deserialized = await serializer.deserialize(json_data)
    assert deserialized is not None
    assert isinstance(deserialized, CustomConfigFrame)
    assert deserialized.config_name == original.config_name
    assert isinstance(deserialized.config, NestedConfig)
    assert deserialized.config.setting1 == original.config.setting1
    assert deserialized.config.setting2 == original.config.setting2
    assert deserialized.config.enabled == original.config.enabled
    assert deserialized.tags == original.tags
    
    print(f"Deserialized frame: {deserialized.__class__.__name__}")
    print(f"Config name preserved: {deserialized.config_name == original.config_name}")
    print(f"Nested config preserved: {deserialized.config.setting1 == original.config.setting1}")
    print(f"Tags preserved: {deserialized.tags == original.tags}")
    print("=" * 50)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
