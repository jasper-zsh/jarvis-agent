import type { WebSocketSerializer } from "@pipecat-ai/websocket-transport";
import type { RTVIMessage } from "@pipecat-ai/client-js";

/**
 * JSON Frame Serializer for Pipecat.
 *
 * This module provides a JSON-based frame serializer for Pipecat framework,
 * enabling serialization and deserialization of frames to/from JSON format for
 * transmission over WebSocket connections. Supports ANY frame type dynamically.
 */

/**
 * JSON-based frame serializer for Pipecat.
 *
 * Serializes frames to JSON format for transmission and deserializes
 * JSON data back to frame objects. Dynamically handles ANY frame type
 * using reflection and introspection.
 *
 * @example
 * ```typescript
 * const serializer = new JSONFrameSerializer();
 * const jsonStr = serializer.serialize(frame);
 * const frame = serializer.deserialize(jsonStr);
 * ```
 */
export class JSONFrameSerializer implements WebSocketSerializer {
  /**
   * Serialize a frame to JSON format.
   *
   * @param frame - The frame to serialize (any Frame type).
   * @returns JSON string representation of frame, or null if serialization fails.
   */
  serialize(frame: any): any {
    if (frame === null) {
      return null;
    }
    try {
      const frameData = this._frameToDict(frame);
      return JSON.stringify(frameData);
    } catch (e) {
      console.error(`Failed to serialize frame ${frame.constructor.name}:`, e);
      return null;
    }
  }

  /**
   * Deserialize JSON data back to a frame object.
   *
   * @param data - JSON string containing serialized frame data.
   * @returns Reconstructed Frame object, or null if deserialization fails.
   */
  deserialize(data: any): Promise<{
    type: "audio";
    audio: Int16Array;
  } | {
    type: "message";
    message: RTVIMessage;
  } | {
    type: "raw";
    message: any;
  }> {
    return new Promise((resolve) => {
      try {
        const frameDict = typeof data === 'string' ? JSON.parse(data) : data;
        let frame: any;
        
        // Check for special type markers
        const frameType = frameDict["___type___"];
        if (frameType === 'audio') {
          const deserialized = this._deserializeAudio(frameDict);
          resolve({
            type: "audio",
            audio: deserialized.audio as Int16Array
          });
        } else if (frameType === 'message') {
          resolve({
            type: "message",
            message: frameDict.message as RTVIMessage
          });
        } else {
          console.log('deserialize raw', data)
          frame = this._dictToFrame(frameDict);
          resolve({
            type: "raw",
            message: frame
          });
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.error("Failed to decode JSON data:", e);
        } else {
          console.error("Failed to deserialize frame:", e);
        }
        resolve({
          type: "raw",
          message: null
        });
      }
    });
  }

  /**
   * Serialize audio data for transmission.
   *
   * @param data - Audio data as ArrayBuffer.
   * @param sample_rate - Sample rate in Hz.
   * @param num_channels - Number of audio channels.
   * @returns Serialized audio data.
   */
  serializeAudio(data: ArrayBuffer, sample_rate: number, num_channels: number): any {
    const uint8Array = new Uint8Array(data);
    const audioBase64 = btoa(String.fromCharCode(...uint8Array));
    const frame = {
      ___type___: 'audio',
      audio: audioBase64,
      sample_rate,
      num_channels
    };
    return JSON.stringify(frame);
  }

  /**
   * Serialize an RTVI message for transmission.
   *
   * @param msg - The RTVI message to serialize.
   * @returns Serialized message data.
   */
  serializeMessage(msg: RTVIMessage): any {
    const frame = {
      ___type___: 'message',
      message: msg
    };
    return JSON.stringify(frame);
  }

  /**
   * Deserialize an audio frame from JSON format.
   *
   * @param frameDict - Dictionary containing serialized audio data.
   * @returns Reconstructed audio frame with Int16Array audio data.
   */
  private _deserializeAudio(frameDict: any): any {
    // Decode base64 string back to Int16Array
    const binaryString = atob(frameDict.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    
    return {
      audio: int16Array,
      sampleRate: frameDict.sampleRate,
      numChannels: frameDict.numChannels
    };
  }

  /**
   * Convert a frame object to a dictionary representation.
   *
   * @param frame - The frame to convert (any Frame type).
   * @returns Dictionary containing frame data with type and fields.
   */
  private _frameToDict(frame: any): Record<string, any> {
    const frameDict: Record<string, any> = {
      "___frame___": frame.constructor.name,
    };

    // Handle base Frame fields
    if (Object.prototype.hasOwnProperty.call(frame, "id")) {
      frameDict["id"] = frame.id;
    }
    if (Object.prototype.hasOwnProperty.call(frame, "name")) {
      frameDict["name"] = frame.name;
    }
    if (Object.prototype.hasOwnProperty.call(frame, "pts")) {
      frameDict["pts"] = frame.pts;
    }
    if (Object.prototype.hasOwnProperty.call(frame, "metadata")) {
      frameDict["metadata"] = frame.metadata;
    }
    if (Object.prototype.hasOwnProperty.call(frame, "transport_source")) {
      frameDict["transport_source"] = frame.transport_source;
    }
    if (Object.prototype.hasOwnProperty.call(frame, "transport_destination")) {
      frameDict["transport_destination"] = frame.transport_destination;
    }

    // Get all fields from the frame object
    // In TypeScript/JavaScript, we iterate over own properties
    for (const key in frame) {
      if (Object.prototype.hasOwnProperty.call(frame, key)) {
        // Skip already handled fields and special markers
        if (key in frameDict || key.startsWith("___") || key.startsWith("__")) {
          continue;
        }

        const value = frame[key];
        // Mark bytes fields for proper deserialization
        if (value instanceof Uint8Array) {
          frameDict[`__${key}_is_bytes__`] = true;
        }
        // Track tuple fields for proper restoration
        // In JavaScript, we don't have a native tuple type, but we can mark arrays that should be tuples
        if (Array.isArray(value) && (value as any).__isTuple__) {
          frameDict[`__${key}_is_tuple__`] = true;
        }
        frameDict[key] = this._serializeValue(value);
      }
    }

    return frameDict;
  }

  /**
   * Convert a dictionary back to a frame object.
   *
   * @param frameDict - Dictionary containing frame data.
   * @returns Reconstructed Frame object, or null if frame type is unknown.
   */
  private _dictToFrame(frameDict: Record<string, any>): any | null {
    const frameTypeName = frameDict["___frame___"];

    if (!frameTypeName) {
      console.error("Invalid frame dict: missing type");
      return null;
    }

    try {
      // In TypeScript/JavaScript, we create a plain object with the frame's properties
      // We don't have dynamic module import like Python, so we reconstruct as a plain object
      const constructorArgs: Record<string, any> = {};

      // Extract constructor arguments from the dict
      // Remove non-constructor fields
      for (const key in frameDict) {
        if (Object.prototype.hasOwnProperty.call(frameDict, key)) {
          // Skip special fields and markers
          if (key === "___frame___" || key.startsWith("___") || key.startsWith("__")) {
            continue;
          }

          // Skip base Frame fields that will be set separately
          if (["id", "name", "pts", "metadata", "transport_source", "transport_destination"].includes(key)) {
            continue;
          }

          const value = frameDict[key];
          // Check if this field was originally bytes
          const isBytesMarker = frameDict[`__${key}_is_bytes__`] || false;
          // Check if this field was originally tuple
          const isTupleMarker = frameDict[`__${key}_is_tuple__`] || false;
          constructorArgs[key] = this._deserializeValue(value, isBytesMarker, isTupleMarker);
        }
      }

      // Create the frame instance as a plain object
      // In a real implementation, you might want to use a factory or registry
      // to create actual frame instances with proper prototypes
      const frame: any = {
        ...constructorArgs,
        constructor: {
          name: frameTypeName,
        },
      };

      // Set non-init fields
      if ("id" in frameDict) {
        frame.id = frameDict["id"];
      }
      if ("name" in frameDict) {
        frame.name = frameDict["name"];
      }
      if ("pts" in frameDict) {
        frame.pts = frameDict["pts"];
      }
      if ("metadata" in frameDict) {
        frame.metadata = frameDict["metadata"];
      }
      if ("transport_source" in frameDict) {
        frame.transport_source = frameDict["transport_source"];
      }
      if ("transport_destination" in frameDict) {
        frame.transport_destination = frameDict["transport_destination"];
      }

      return frame;
    } catch (e) {
      console.error(`Failed to create frame of type ${frameTypeName}:`, e);
      return null;
    }
  }

  /**
   * Serialize a value to JSON-compatible format.
   *
   * @param value - The value to serialize.
   * @returns JSON-serializable representation of the value.
   */
  private _serializeValue(value: any): any {
    if (value === null) {
      return null;
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    } else if (value instanceof Uint8Array) {
      // Convert bytes to base64 encoded string
      return btoa(String.fromCharCode(...value));
    } else if (Array.isArray(value)) {
      return value.map((item) => this._serializeValue(item));
    } else if (typeof value === "object" && value !== null) {
      // Check if this is a frame-like object with type information
      if ("___frame___" in value) {
        return this._frameToDict(value);
      } else {
        // Handle regular objects
        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = this._serializeValue(value[key]);
          }
        }
        return result;
      }
    } else {
      return String(value);
    }
  }

  /**
   * Deserialize a value from JSON format.
   *
   * @param value - The value to deserialize.
   * @param isBytes - Whether the original value was bytes (for base64 decoding).
   * @param isTuple - Whether the original value was tuple (for type restoration).
   * @returns Deserialized value.
   */
  private _deserializeValue(value: any, isBytes: boolean = false, isTuple: boolean = false): any {
    if (value === null) {
      return null;
    } else if (typeof value === "string" && isBytes) {
      // Decode base64 string back to bytes (Uint8Array)
      const binaryString = atob(value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    } else if (Array.isArray(value)) {
      // Recursively deserialize list items
      const deserializedList: any[] = [];
      for (const item of value) {
        // Check if item is a serialized frame/dataclass
        if (typeof item === "object" && item !== null && "___frame___" in item) {
          deserializedList.push(this._dictToFrame(item));
        } else {
          deserializedList.push(this._deserializeValue(item));
        }
      }
      // Convert to tuple if this was originally a tuple
      // In JavaScript, we mark it as a tuple for future serialization
      if (isTuple) {
        (deserializedList as any).__isTuple__ = true;
      }
      return deserializedList;
    } else if (typeof value === "object" && value !== null) {
      // Check if this is a serialized frame
      if ("___frame___" in value) {
        return this._dictToFrame(value);
      } else {
        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = this._deserializeValue(value[key]);
          }
        }
        return result;
      }
    } else {
      return value;
    }
  }
}
