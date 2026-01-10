from loguru import logger
from pipecat.services.ai_service import AIService
from pipecat.services.stt_service import STTService
from pipecat.frames.frames import UserStartedSpeakingFrame, UserStoppedSpeakingFrame, TranscriptionFrame, InterimTranscriptionFrame, AudioRawFrame
from pipecat.utils.time import time_now_iso8601, seconds_to_nanoseconds

from dashscope.audio.asr import *
import dashscope
import asyncio
import wave
import bisect
import time
from dataclasses import dataclass
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    pass

def time_now_ns() -> int:
    """Get the current time in nanoseconds.
    
    Returns:
        The current time as nanoseconds since the Unix epoch.
    """
    return int(time.time() * 1_000_000_000)

@dataclass
class TimestampedAudioFrame:
    """带时间戳的音频帧包装器"""
    audio: bytes
    pts: int  # 时间戳（纳秒）
    sample_rate: int
    num_channels: int
    num_frames: int
    
    @classmethod
    def from_audio_raw_frame(cls, frame: AudioRawFrame, last_pts: Optional[int] = None) -> 'TimestampedAudioFrame':
        """从AudioRawFrame创建TimestampedAudioFrame"""
        # 确保frame.pts是整数，如果是None则使用当前时间
        pts = frame.pts
        if pts is None:
            pts = time_now_ns()
        elif not isinstance(pts, int):
            # 如果pts是浮点数或其他类型，转换为整数纳秒
            pts = int(pts)
        
        ts_frame = cls(
            audio=frame.audio,
            pts=pts,
            sample_rate=frame.sample_rate,
            num_channels=frame.num_channels,
            num_frames=frame.num_frames
        )
        return validate_and_fix_timestamp(ts_frame, last_pts)


def validate_and_fix_timestamp(frame: TimestampedAudioFrame, last_pts: Optional[int] = None) -> TimestampedAudioFrame:
    """验证和修复时间戳"""
    current_time = time_now_ns()
    
    # 检查时间戳是否为None
    if frame.pts is None:
        frame.pts = current_time
        logger.warning("AudioRawFrame has no pts, using current time")
    
    # 检查时间戳是否在未来（允许小范围时钟偏差）
    max_future_offset_ns = 100_000_000  # 100ms
    if frame.pts > current_time + max_future_offset_ns:
        logger.warning(f"AudioFrame pts {frame.pts} is significantly in the future, using current time")
        frame.pts = current_time
    
    # 检查时间戳是否在过去太多（可能是旧数据）
    max_past_offset_ns = 5_000_000_000  # 5秒
    if frame.pts < current_time - max_past_offset_ns:
        logger.warning(f"AudioFrame pts {frame.pts} is too old, using current time")
        frame.pts = current_time
    
    # 检查时间戳顺序
    if last_pts is not None and frame.pts < last_pts:
        logger.warning(f"AudioFrame pts {frame.pts} is before last pts {last_pts}, adjusting")
        frame.pts = last_pts + 1  # 确保递增
    
    return frame


class TimeOrderedBuffer:
    """按时间顺序管理的音频缓冲区"""
    def __init__(self, max_duration_seconds: float = 1.0):
        self._frames: List[TimestampedAudioFrame] = []
        self._max_duration_ns = int(max_duration_seconds * 1_000_000_000)
        self._last_pts: Optional[int] = None
    
    def add_frame(self, frame: TimestampedAudioFrame) -> None:
        """添加帧并处理缓冲区溢出"""
        # 检查单个帧是否过大
        max_frame_duration_ns = 100_000_000  # 100ms
        frame_duration_ns = frame.num_frames * 1_000_000_000 // frame.sample_rate
        if frame_duration_ns > max_frame_duration_ns:
            logger.warning(f"Large audio frame detected: {frame_duration_ns/1_000_000}ms")
        
        # 验证时间戳
        frame = validate_and_fix_timestamp(frame, self._last_pts)
        self._last_pts = frame.pts
        
        # 使用二分查找插入位置
        insert_pos = bisect.bisect_left([f.pts for f in self._frames], frame.pts)
        self._frames.insert(insert_pos, frame)
        
        # 检查缓冲区是否溢出
        while self.get_duration_ns() > self._max_duration_ns:
            # 移除最早的帧（正常行为，不记录日志）
            self._frames.pop(0)
        
        self._remove_old_frames()
    
    def _remove_old_frames(self) -> None:
        """移除超过最大持续时间的旧帧"""
        if not self._frames:
            return
        
        current_time = time_now_ns()
        cutoff_time = current_time - self._max_duration_ns
        
        # 找到第一个应该保留的帧
        first_keep_idx = 0
        while first_keep_idx < len(self._frames) and self._frames[first_keep_idx].pts < cutoff_time:
            first_keep_idx += 1
        
        if first_keep_idx > 0:
            self._frames = self._frames[first_keep_idx:]
    
    def get_frames_up_to(self, pts: int) -> List[TimestampedAudioFrame]:
        """获取指定时间戳之前的所有帧"""
        cutoff_idx = bisect.bisect_right([f.pts for f in self._frames], pts)
        result = self._frames[:cutoff_idx]
        self._frames = self._frames[cutoff_idx:]
        return result
    
    def get_all_frames(self) -> List[TimestampedAudioFrame]:
        """获取所有帧并清空缓冲区"""
        result = self._frames.copy()
        self._frames.clear()
        return result
    
    def is_empty(self) -> bool:
        return len(self._frames) == 0
    
    def get_duration_ns(self) -> int:
        """获取缓冲区中音频的总时长（纳秒）"""
        if not self._frames:
            return 0
        
        # 计算第一帧开始到最后一帧结束的时间差
        first_frame = self._frames[0]
        last_frame = self._frames[-1]
        
        # 计算最后一帧的持续时间（纳秒）
        last_frame_duration_ns = last_frame.num_frames * 1_000_000_000 // last_frame.sample_rate
        
        # 总持续时间 = (最后一帧时间戳 - 第一帧时间戳) + 最后一帧持续时间
        total_duration = (last_frame.pts - first_frame.pts) + last_frame_duration_ns
        
        return total_duration


class TimeSynchronizedSender:
    """时间同步发送器，确保按正确时间间隔发送音频"""
    def __init__(self, recognition_service, sample_rate: int = 16000):
        self._recognition = recognition_service
        self._sample_rate = sample_rate
        self._last_sent_pts: Optional[int] = None
        self._send_task: Optional[asyncio.Task] = None
    
    async def send_frames_synchronized(self, frames: List[TimestampedAudioFrame]) -> None:
        """带异常处理的同步发送"""
        if not frames:
            return
        
        frames.sort(key=lambda f: f.pts)
        current_time = time_now_ns()
        
        for i, frame in enumerate(frames):
            try:
                # 计算延迟
                target_time = frame.pts
                if target_time > current_time:
                    delay_seconds = (target_time - current_time) / 1_000_000_000
                    await asyncio.sleep(delay_seconds)
                    current_time = time_now_ns()
                
                # 发送帧，带重试机制
                max_retries = 3
                for retry in range(max_retries):
                    try:
                        self._recognition.send_audio_frame(frame.audio)
                        break
                    except Exception as e:
                        if retry == max_retries - 1:
                            logger.error(f"Failed to send audio frame after {max_retries} retries: {e}")
                            raise
                        await asyncio.sleep(0.1 * (retry + 1))  # 指数退避
                
                self._last_sent_pts = frame.pts
                
            except Exception as e:
                logger.error(f"Error sending frame {i}/{len(frames)}: {e}")
                # 继续处理下一帧，而不是完全失败
                continue
    
    async def send_frame_realtime(self, frame: TimestampedAudioFrame) -> None:
        """实时发送单个帧"""
        max_retries = 2  # 实时发送减少重试次数
        for retry in range(max_retries):
            try:
                self._recognition.send_audio_frame(frame.audio)
                self._last_sent_pts = frame.pts
                break  # 成功发送，退出重试循环
            except Exception as e:
                if retry == max_retries - 1:
                    # 最后一次重试失败，记录错误但不抛出异常
                    logger.error(f"Failed to send realtime frame after {max_retries} retries: {e}")
                    return
                # 短暂延迟后重试
                await asyncio.sleep(0.05 * (retry + 1))


class QwenASRCallback(RecognitionCallback):
    def __init__(self, service: 'QwenASRService'):
        super().__init__()
        self.service = service
        self.loop = asyncio.get_running_loop()
    
    def on_open(self):
        logger.info('Recognition connected')
        self.service._connected = True
        self.service._connection_established_time = time_now_ns()
        
        if len(self.service._record_base) > 0:
            filename = f'{self.service._record_base}_{self.service._record_index}.wav'
            logger.info(f'Opening recording file {filename}')
            wav = wave.open(open(filename, 'wb'), 'wb')
            wav.setsampwidth(2)
            wav.setnchannels(1)
            wav.setframerate(16000)
            self.service._record_wav = wav
            self.service._record_index += 1
            
        # 处理缓冲区中的历史数据
        if not self.service._time_buffer.is_empty():
            buffered_frames = self.service._time_buffer.get_all_frames()
            logger.info(f'Sending cached {len(buffered_frames)} frames with timestamps')
            
            # 按时间同步方式发送
            task = asyncio.create_task(
                self.service._time_sender.send_frames_synchronized(buffered_frames)
            )
            # 添加异常处理，避免任务静默失败
            task.add_done_callback(lambda t: logger.error(f"Buffered frames sending failed: {t.exception()}")
                                 if t.exception() else None)
            
            # 录制缓冲区音频
            if self.service._record_wav is not None:
                for frame in buffered_frames:
                    self.service._record_wav.writeframes(frame.audio)

    def on_close(self):
        logger.info('Recognition stopped')
        asyncio.run_coroutine_threadsafe(self.service._cleanup(), self.loop)

    def on_complete(self):
        logger.info('ASR completed')

    def on_error(self, result):
        logger.error(f'ASR error: {result}')
    
    def on_event(self, result):
        sentence = result.get_sentence()
        if 'text' in sentence:
            r = sentence['text']
            logger.info(f'ASR result: {r}')
            if RecognitionResult.is_sentence_end(sentence):
                logger.info(f'Recognition sentence end, request_id: {result.get_request_id()} usage: {result.get_usage(sentence)}')
                asyncio.run_coroutine_threadsafe(self.service.push_frame(TranscriptionFrame(
                    text=r,
                    user_id='',
                    timestamp=time_now_iso8601(),
                )), self.loop)
            else:
                logger.info(f'Partial ASR result: {r}')
                asyncio.run_coroutine_threadsafe(self.service.push_frame(InterimTranscriptionFrame(
                    text=r,
                    user_id='',
                    timestamp=time_now_iso8601(),
                )), self.loop)
        else:
            logger.info(f'Unknown asr result: {sentence}')

class QwenASRService(AIService):
    def __init__(
            self,
            api_key,
            model='fun-asr-realtime',
            base_url='wss://dashscope.aliyuncs.com/api-ws/v1/inference',
            record_base='',
            **kwargs
        ):
        super().__init__(audio_passthrough=False, sample_rate=16000, **kwargs)
        self._connected = False
        self._user_speaking = False
        self._stopping = False
        self._callback = QwenASRCallback(self)
        dashscope.api_key = api_key
        dashscope.base_websocket_api_url = base_url
        self._recognition = Recognition(
            model,
            callback=self._callback,
            sample_rate=16000,
            format='wav'
        )
        self._record_index = 0
        self._record_wav = None
        self._record_base = record_base
        
        # 新增时间处理相关属性
        self._time_buffer = TimeOrderedBuffer(max_duration_seconds=1.0)
        self._time_sender = TimeSynchronizedSender(self._recognition, sample_rate=16000)
        self._connection_established_time: Optional[int] = None
        self._last_pts: Optional[int] = None

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        if isinstance(frame, AudioRawFrame):
            await self.process_audio_frame(frame)
        if isinstance(frame, UserStartedSpeakingFrame):
            await self._user_started_speaking(frame)
        elif isinstance(frame, UserStoppedSpeakingFrame):
            await self._user_stopped_speaking(frame)
        else:
            await self.push_frame(frame, direction)
    
    async def process_audio_frame(self, frame: AudioRawFrame):
        """处理音频帧，考虑时间戳"""
        # 如果正在停止，不处理新帧
        if self._stopping:
            return
        
        # 转换为带时间戳的帧
        ts_frame = TimestampedAudioFrame.from_audio_raw_frame(frame, self._last_pts)
        self._last_pts = ts_frame.pts
        
        if not self._user_speaking:
            # 用户未说话时，添加到缓冲区
            self._time_buffer.add_frame(ts_frame)
            return
        
        if not self._connected:
            # 连接未建立，添加到缓冲区
            logger.info(f'Connecting, cached {len(frame.audio)} bytes of audio with pts {ts_frame.pts}')
            self._time_buffer.add_frame(ts_frame)
        else:
            # 连接已建立，实时发送
            logger.info(f'Sending {len(frame.audio)} bytes of audio with pts {ts_frame.pts}')
            if self._record_wav is not None:
                self._record_wav.writeframes(frame.audio)
            await self._time_sender.send_frame_realtime(ts_frame)
    
    async def _user_started_speaking(self, frame: UserStartedSpeakingFrame):
        if frame.emulated:
            return
        self._user_speaking = True
        if not self._recognition._running:
            self._recognition.start()
    
    async def _user_stopped_speaking(self, frame: UserStoppedSpeakingFrame):
        if frame.emulated:
            return
        
        self._user_speaking = False
        # Set stopping flag to prevent new frames from being processed
        self._stopping = True
        
        # Drain the buffer - send all remaining buffered audio
        if not self._time_buffer.is_empty():
            buffered_frames = self._time_buffer.get_all_frames()
            logger.info(f'Draining buffer: sending {len(buffered_frames)} frames before stopping')
            
            # Send buffered frames
            await self._time_sender.send_frames_synchronized(buffered_frames)
            
            # Record buffered audio if recording
            if self._record_wav is not None:
                for frame in buffered_frames:
                    self._record_wav.writeframes(frame.audio)
        
        # Now stop the recognition after buffer is drained
        if self._recognition._running:
            self._recognition.stop()
        
        # Close recording file if open
        if self._record_wav is not None:
            self._record_wav.close()
            self._record_wav = None
    
    async def _cleanup(self):
        """清理资源"""
        self._connected = False
        self._connection_established_time = None
        self._last_pts = None
        self._time_buffer = TimeOrderedBuffer(max_duration_seconds=1.0)
        self._stopping = False