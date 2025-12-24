import { TurboModuleRegistry, type TurboModule, type CodegenTypes } from 'react-native';

export enum CxrStatus {
  BLUETOOTH_AVAILABLE,
  BLUETOOTH_UNAVAILABLE,
  BLUETOOTH_INIT,
  WIFI_AVAILABLE,
  WIFI_UNAVAILABLE,
  WIFI_INIT,
  REQUEST_SUCCEED,
  REQUEST_FAILED,
  REQUEST_WAITING,
  RESPONSE_SUCCEED,
  RESPONSE_INVALID,
  RESPONSE_TIMEOUT,
}

export enum CxrStreamType {
  WORD_TIPS,
}

export enum CxrMediaType {
  AUDIO,
  PICTURE,
  VIDEO,
  ALL,
}

export enum CxrSceneType {
  AI_CHAT,
  TRANSLATE,
  AUDIO_RECORD,
  VIDEO_RECORD,
  WORD_TIPS,
  NAVIGATION,
}

export enum CxrSendErrorCode {
    UNKNOWN,
}

export enum CxrWifiErrorCode {
    SUCCEED,
    WIFI_DISABLED,
    WIFI_CONNECT_FAILED,
    UNKNOWN,
}

export type BluetoothDevice = {
    name: string,
    address: string,
    data: string,
}

export enum CxrBluetoothErrorCode {
    SUCCEED,
    PARAM_INVALID,
    BLE_CONNECT_FAILED,
    SOCKET_CONNECT_FAILED,
    UNKNOWN,
}

export type BluetoothOnConnected = () => void;
export type BluetoothOnConnectionInfo = (v1: string, v2: string, v3: string, v4: number) => void;
export type BluetoothOnDisconnected = () => void;
export type BluetoothOnFailed = (code: CxrBluetoothErrorCode) => void;

export type IconInfo = {
  name: string,
  data: string,
}

export type GlassInfo = {
    deviceName: string,
    batteryLevel: number,
    isCharging: boolean,
    devicePanel: string,
    brightness: number,
    sound: number,
    wearingStatus: string,
    deviceKey: string,
    deviceSecret: string,
    deviceTypeId: string,
    deviceId: string,
    deviceSeed: string,
    otaCheckUrl: string,
    otaCheckApi: string,
    assistVersionName: string,
    assistVersionCode: number,
    systemVersion: string,
};
export type GlassInfoResult = {
    status: CxrStatus,
    info: GlassInfo,
}
export type GlassInfoResultCallback = (info: GlassInfoResult) => void;

export type PhotoResult = {
    status: CxrStatus,
    data: string,
}
export type PhotoResultCallback = (result: PhotoResult) => void;

export type PhotoPath = {
    status: CxrStatus,
    path: string,
}
export type PhotoPathCallback = (path: PhotoPath) => void;

export type SendSucceedCallback = () => void;
export type SendFailedCallback = (code: CxrSendErrorCode) => void;

export type UnsyncNumResultCallback = (status: CxrStatus, v2: number, v3: number, v4: number) => void;

export type WifiConnectedCallback = () => void;
export type WifiDisconnectedCallback = () => void;
export type WifiFailedCallback = (code: CxrWifiErrorCode) => void;

export type SyncStartCallback = () => void;
export type SingleFileSyncedCallback = (v1: string) => void;
export type SyncFailedCallback = () => void;
export type SyncFinishedCallback = () => void;

export type ArtcFrame = {
    data: string,
}

export type StartAudioStreamEvent = {
    codecType: number,
    scene: string,
}
export type AudioStreamEvent = {
    data: string
}

export type BatteryLevel = {
    value: number,
    charging: boolean,
}

export type BrightnessEvent = {
    value: number,
}

export type CustomViewOpenFailedEvent = {
    v1: number,
}

export type SceneStatusInfo = {
    aiAssistRunning: boolean,
    aiChatRunning: boolean,
    audioRecordRunning: boolean,
    brightnessRunning: boolean,
    hasDisplay: boolean,
    navigationRunning: boolean,
    notesRunning: boolean,
    otaRunning: boolean,
    paymentRunning: boolean,
    phoneCallRunning: boolean,
    translateRunning: boolean,
    videoRecordRunning: boolean,
    wordTipsRunning: boolean,
    customViewRunning: boolean,
}

export type VolumeUpdateEvent = {
    value: number,
}

export interface Spec extends TurboModule {
  readonly onAiKeyDown: CodegenTypes.EventEmitter<void>;
  readonly onAiKeyUp: CodegenTypes.EventEmitter<void>;
  readonly onAiExit: CodegenTypes.EventEmitter<void>;

  readonly onArtcStart: CodegenTypes.EventEmitter<void>;
  readonly onArtcStop: CodegenTypes.EventEmitter<void>;
  readonly onArtcFrame: CodegenTypes.EventEmitter<ArtcFrame>;

  readonly onStartAudioStream: CodegenTypes.EventEmitter<StartAudioStreamEvent>;
  readonly onAudioStream: CodegenTypes.EventEmitter<AudioStreamEvent>;

  readonly onBatteryLevelUpdated: CodegenTypes.EventEmitter<BatteryLevel>;

  readonly onBrightnessUpdated: CodegenTypes.EventEmitter<BrightnessEvent>;

  readonly onCustomViewIconsSent: CodegenTypes.EventEmitter<void>;
  readonly onCustomViewOpened: CodegenTypes.EventEmitter<void>;
  readonly onCustomViewOpenFailed: CodegenTypes.EventEmitter<CustomViewOpenFailedEvent>;
  readonly onCustomViewUpdated: CodegenTypes.EventEmitter<void>;
  readonly onCustomViewClosed: CodegenTypes.EventEmitter<void>;

  readonly onMediaFilesUpdated: CodegenTypes.EventEmitter<void>;

  readonly onSceneStatusUpdated: CodegenTypes.EventEmitter<SceneStatusInfo>;

  readonly onTranslationStart: CodegenTypes.EventEmitter<void>;
  readonly onTranslationStop: CodegenTypes.EventEmitter<void>;

  readonly onVolumeUpdated: CodegenTypes.EventEmitter<VolumeUpdateEvent>;

  initBluetooth(device: BluetoothDevice, onConnectionInfo: BluetoothOnConnectionInfo, onConnected: BluetoothOnConnected, onDisconnected: BluetoothOnDisconnected, onFailed: BluetoothOnFailed): void;
  updateRokidAccount(account: string): void;
  connectBluetooth(v2: string, v3: string, onConnectionInfo: BluetoothOnConnectionInfo, onConnected: BluetoothOnConnected, onDisconnected: BluetoothOnDisconnected, onFailed: BluetoothOnFailed): void;
  isBluetoothConnected(): boolean;
  setCommunicationDevice(): void;
  clearCommunicationDevice(): void;
  setGlassTime(): CxrStatus;
  getGlassInfo(callback: GlassInfoResultCallback): CxrStatus;
  setGlassBrightness(value: number): CxrStatus;
  setGlassVolume(value: number): CxrStatus;
  sendExitEvent(): CxrStatus;
  sendAsrContent(text: string): CxrStatus;
  notifyAsrNone(): CxrStatus;
  notifyAsrEnd(): CxrStatus;
  notifyAsrError(): CxrStatus;
  notifyAiStart(): CxrStatus;
  openGlassCamera(witdh: number, height: number, quality: number): CxrStatus;
  takeGlassPhotoWithResult(width: number, height: number, quality: number, onPhotoResult: PhotoResultCallback): CxrStatus;
  takeGlassPhotoWithPath(width: number, height: number, quality: number, onPhotoPath: PhotoPathCallback): CxrStatus;
  sendTtsContent(text: string): CxrStatus;
  notifyTtsAudioFinished(): CxrStatus;
  notifyNoNetwork(): CxrStatus;
  notifyPicUploadError(): CxrStatus;
  notifyAiError(): CxrStatus;
  configWordTipsText(textSize: number, lineSpace: number, mode: string, startX: number, startY: number, width: number, height: number): CxrStatus;
  sendWordTipsAsrContent(text: string): CxrStatus;
  sendStream(streamType: CxrStreamType, data: string, filename: string, onSucceed: SendSucceedCallback, onFailed: SendFailedCallback): CxrStatus;
  openAudioRecord(streamType: number, scene: string): CxrStatus;
  closeAudioRecord(scene: string): CxrStatus;
  getUnsyncNum(onUnsyncNumResult: UnsyncNumResultCallback): CxrStatus;
  deinitBluetooth(): void;
  initWifiP2P(onConnected: WifiConnectedCallback, onDisconnected: WifiDisconnectedCallback, onFailed: WifiFailedCallback): CxrStatus;
  isWifiP2PConnected(): boolean;
  deinitWifiP2P(): CxrStatus;
  startSync(savePath: string, mediaTypes: CxrMediaType[], onSyncStart: SyncStartCallback, onSingleFileSynced: SingleFileSyncedCallback, onSyncFailed: SyncFailedCallback, onSyncFinished: SyncFinishedCallback): CxrStatus;
  syncSingleFile(savePath: string, mediaType: CxrMediaType, filePath: string, onSyncStart: SyncStartCallback, onSingleFileSynced: SingleFileSyncedCallback, onSyncFailed: SyncFailedCallback, onSyncFinished: SyncFinishedCallback): CxrStatus;
  stopSync(): void;
  setPhotoParams(width: number, height: number): CxrStatus;
  setVideoParams(duration: number, fps: number, width: number, height: number, unit: number): CxrStatus;
  setSoundEffect(text: string): CxrStatus;
  setScreenOffTimeout(value: number): CxrStatus;
  configTranslationText(textSize: number, startX: number, startY: number, width: number, height: number): CxrStatus;
  sendTranslationContent(id: number, subId: number, temporary: boolean, finished: boolean, content: string): CxrStatus;
  stopArtc(): CxrStatus;
  configArtcFrame(width: number, height: number, rotate: number, frameRate: number, videoEncoderMode: number): CxrStatus;
  sendArtcSpeakStatus(isSpeaking: boolean): CxrStatus;
  sendArtcAsrContent(content: string, isSentenceEnd: boolean, sentenceId: number): CxrStatus;
  sendArtcTtsContent(content: string, isSentenceEnd: boolean, sentenceId: number): CxrStatus;
  sendGlobalMsgContent(iconType: number, content: string, playTts: boolean): CxrStatus;
  sendGlobalToastContent(iconType: number, content: string, playTts: boolean): CxrStatus;
  sendGlobalTtsContent(content: string): CxrStatus;
  // sendCustomCmd(cmd: string, args: any): CxrStatus;
  controlScene(sceneType: CxrSceneType, enabled: boolean, extraArgs: string): CxrStatus;
  notifyGlassReboot(): CxrStatus;
  notifyGlassShutdown(): CxrStatus;
  sendCustomViewIcons(icons: IconInfo[]): CxrStatus;
  openCustomView(content: string): CxrStatus;
  updateCustomView(content: string): CxrStatus;
  closeCustomView(): CxrStatus;
  setPowerOffTimeout(value: number): CxrStatus;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RokidCxrClientM');
