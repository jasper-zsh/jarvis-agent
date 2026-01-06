"""JSON Frame Serializer for Pipecat.

This module provides a JSON-based frame serializer for Pipecat framework,
enabling serialization and deserialization of frames to/from JSON format for
transmission over WebSocket connections. Supports ANY frame type dynamically.
"""

import base64
import importlib
import json
from typing import Any, Dict, Optional

from loguru import logger

from pipecat.serializers.base_serializer import FrameSerializer, FrameSerializerType


class JSONFrameSerializer(FrameSerializer):
    """JSON-based frame serializer for Pipecat.

    Serializes frames to JSON format for transmission and deserializes
    JSON data back to frame objects. Dynamically handles ANY frame type
    using reflection and introspection.

    Example:
        serializer = JSONFrameSerializer()
        json_data = await serializer.serialize(frame)
        frame = await serializer.deserialize(json_data)
    """

    @property
    def type(self) -> FrameSerializerType:
        """Get the serialization type.

        Returns:
            FrameSerializerType.TEXT indicating text-based JSON serialization.
        """
        return FrameSerializerType.TEXT

    async def serialize(self, frame: Any) -> Optional[str]:
        """Serialize a frame to JSON format.

        Args:
            frame: The frame to serialize (any Frame type).

        Returns:
            JSON string representation of frame, or None if serialization fails.
        """
        if frame is None:
            return None
        try:
            frame_data = self._frame_to_dict(frame)
            json_str = json.dumps(frame_data)
            return json_str
        except Exception as e:
            logger.error(f"Failed to serialize frame {frame.__class__.__name__}: {e}")
            return None

    async def deserialize(self, data: str) -> Optional[Any]:
        """Deserialize JSON data back to a frame object.

        Args:
            data: JSON string containing serialized frame data.

        Returns:
            Reconstructed Frame object, or None if deserialization fails.
        """
        try:
            frame_dict = json.loads(data)
            frame = self._dict_to_frame(frame_dict)
            return frame
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON data: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to deserialize frame: {e}")
            return None

    def _frame_to_dict(self, frame: Any) -> Dict[str, Any]:
        """Convert a frame object to a dictionary representation.

        Args:
            frame: The frame to convert (any Frame type).

        Returns:
            Dictionary containing frame data with type and fields.
        """
        frame_dict = {
            "___type___": frame.__class__.__name__,
        }
        
        # Only serialize module if it's not from pipecat.frames.frames
        if frame.__class__.__module__ != "pipecat.frames.frames":
            frame_dict["module"] = frame.__class__.__module__

        # Handle base Frame fields
        if hasattr(frame, "id"):
            frame_dict["id"] = frame.id
        if hasattr(frame, "name"):
            frame_dict["name"] = frame.name
        if hasattr(frame, "pts"):
            frame_dict["pts"] = frame.pts
        if hasattr(frame, "metadata"):
            frame_dict["metadata"] = frame.metadata
        if hasattr(frame, "transport_source"):
            frame_dict["transport_source"] = frame.transport_source
        if hasattr(frame, "transport_destination"):
            frame_dict["transport_destination"] = frame.transport_destination

        # Get all fields from the frame using dataclass inspection
        if hasattr(frame, "__dataclass_fields__"):
            for field_name, field_info in frame.__dataclass_fields__.items():
                # Skip fields that are not init (computed fields)
                if not field_info.init:
                    continue

                if field_name in frame_dict:
                    continue

                if hasattr(frame, field_name):
                    value = getattr(frame, field_name)
                    # Mark bytes fields for proper deserialization
                    if isinstance(value, bytes):
                        frame_dict[f"__{field_name}_is_bytes__"] = True
                    # Track tuple fields for proper restoration
                    if isinstance(value, tuple):
                        frame_dict[f"__{field_name}_is_tuple__"] = True
                    frame_dict[field_name] = self._serialize_value(value)
        # Handle Pydantic models - use class.model_fields instead of instance
        elif hasattr(frame.__class__, "model_fields"):
            for field_name in frame.__class__.model_fields:
                if field_name in frame_dict:
                    continue

                if hasattr(frame, field_name):
                    value = getattr(frame, field_name)
                    # Mark bytes fields for proper deserialization
                    if isinstance(value, bytes):
                        frame_dict[f"__{field_name}_is_bytes__"] = True
                    # Track tuple fields for proper restoration
                    if isinstance(value, tuple):
                        frame_dict[f"__{field_name}_is_tuple__"] = True
                    frame_dict[field_name] = self._serialize_value(value)

        return frame_dict

    def _dict_to_frame(self, frame_dict: Dict[str, Any]) -> Optional[Any]:
        """Convert a dictionary back to a frame object.

        Args:
            frame_dict: Dictionary containing frame data.

        Returns:
            Reconstructed Frame object, or None if frame type is unknown.
        """
        frame_type_name = frame_dict.get("___type___")
        frame_module = frame_dict.get("module", "pipecat.frames.frames")

        if not frame_type_name:
            logger.error(f"Invalid frame dict: missing type")
            return None

        try:
            # Dynamically import the frame class
            module = importlib.import_module(frame_module)
            frame_class = getattr(module, frame_type_name)

            # Extract constructor arguments from the dict
            # Remove non-constructor fields
            constructor_args = {}
            if hasattr(frame_class, "__dataclass_fields__"):
                for field_name, field_info in frame_class.__dataclass_fields__.items():
                    if field_name in frame_dict and field_info.init:
                        value = frame_dict[field_name]
                        # Check if this field was originally bytes
                        is_bytes_marker = frame_dict.get(f"__{field_name}_is_bytes__", False)
                        # Check if this field was originally tuple
                        is_tuple_marker = frame_dict.get(f"__{field_name}_is_tuple__", False)
                        constructor_args[field_name] = self._deserialize_value(value, is_bytes_marker, is_tuple_marker)
            # Handle Pydantic models
            elif hasattr(frame_class, "model_fields"):
                for field_name in frame_class.model_fields:
                    if field_name in frame_dict:
                        value = frame_dict[field_name]
                        # Check if this field was originally bytes
                        is_bytes_marker = frame_dict.get(f"__{field_name}_is_bytes__", False)
                        # Check if this field was originally tuple
                        is_tuple_marker = frame_dict.get(f"__{field_name}_is_tuple__", False)
                        constructor_args[field_name] = self._deserialize_value(value, is_bytes_marker, is_tuple_marker)
             
            # Remove marker fields (they're not actual frame fields)
            constructor_args = {k: v for k, v in constructor_args.items() if not (k.startswith("__") and k.endswith("__"))}

            # Create the frame instance
            frame = frame_class(**constructor_args)

            # Set non-init fields
            if "id" in frame_dict and hasattr(frame, "id"):
                object.__setattr__(frame, "id", frame_dict["id"])
            if "name" in frame_dict and hasattr(frame, "name"):
                object.__setattr__(frame, "name", frame_dict["name"])
            if "pts" in frame_dict and hasattr(frame, "pts"):
                object.__setattr__(frame, "pts", frame_dict["pts"])
            if "metadata" in frame_dict and hasattr(frame, "metadata"):
                object.__setattr__(frame, "metadata", frame_dict["metadata"])
            if "transport_source" in frame_dict and hasattr(frame, "transport_source"):
                object.__setattr__(frame, "transport_source", frame_dict["transport_source"])
            if "transport_destination" in frame_dict and hasattr(frame, "transport_destination"):
                object.__setattr__(frame, "transport_destination", frame_dict["transport_destination"])

            return frame

        except ImportError as e:
            logger.error(f"Failed to import module {frame_module}: {e}")
            return None
        except AttributeError as e:
            logger.error(f"Frame class {frame_type_name} not found in module {frame_module}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to create frame of type {frame_type_name}: {e}")
            return None

    def _serialize_value(self, value: Any) -> Any:
        """Serialize a value to JSON-compatible format.

        Args:
            value: The value to serialize.

        Returns:
            JSON-serializable representation of the value.
        """
        if value is None:
            return None
        elif isinstance(value, (str, int, float, bool)):
            return value
        elif isinstance(value, bytes):
            return base64.b64encode(value).decode("utf-8")
        elif isinstance(value, (list, tuple)):
            return [self._serialize_value(item) for item in value]
        elif isinstance(value, dict):
            return {k: self._serialize_value(v) for k, v in value.items()}
        elif hasattr(value.__class__, "model_fields"):
            # Handle Pydantic model instances recursively
            return self._frame_to_dict(value)
        elif hasattr(value, "__dataclass_fields__"):
            # Handle dataclass instances recursively
            return self._frame_to_dict(value)
        elif hasattr(value, "__dict__"):
            # Handle regular objects
            return {k: self._serialize_value(v) for k, v in value.__dict__.items()}
        else:
            return str(value)

    def _deserialize_value(self, value: Any, is_bytes: bool = False, is_tuple: bool = False) -> Any:
        """Deserialize a value from JSON format.

        Args:
            value: The value to deserialize.
            is_bytes: Whether the original value was bytes (for base64 decoding).
            is_tuple: Whether the original value was tuple (for type restoration).

        Returns:
            Deserialized value.
        """
        if value is None:
            return None
        elif isinstance(value, str) and is_bytes:
            # Decode base64 string back to bytes
            return base64.b64decode(value)
        elif isinstance(value, (str, int, float, bool)):
            return value
        elif isinstance(value, list):
            # Recursively deserialize list items
            deserialized_list = []
            for item in value:
                # Check if item is a serialized frame/dataclass
                if isinstance(item, dict) and "___type___" in item:
                    deserialized_list.append(self._dict_to_frame(item))
                else:
                    deserialized_list.append(self._deserialize_value(item))
            # Convert to tuple if this was originally a tuple
            return tuple(deserialized_list) if is_tuple else deserialized_list
        elif isinstance(value, dict):
            # Check if this is a serialized frame
            if "___type___" in value:
                return self._dict_to_frame(value)
            else:
                return {k: self._deserialize_value(v) for k, v in value.items()}
        else:
            return value
