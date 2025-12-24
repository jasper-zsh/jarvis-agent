package pro.sihao.rokid.cxr.client

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.rokid.cxr.client.extend.CxrApi
import com.rokid.cxr.client.utils.ValueUtil

@ReactModule(name = RokidCxrClientMModule.NAME)
class RokidCxrClientMModule(reactContext: ReactApplicationContext) :
  NativeRokidCxrClientMSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

    override fun initBluetooth(
        device: ReadableMap?,
        onConnectionInfo: Callback?,
        onConnected: Callback?,
        onDisconnected: Callback?,
        onFailed: Callback?
    ) {
        TODO("Not yet implemented")
    }

    override fun updateRokidAccount(account: String?) {
        CxrApi.getInstance().updateRokidAccount(account)
    }

    override fun connectBluetooth(
        v2: String?,
        v3: String?,
        onConnectionInfo: Callback?,
        onConnected: Callback?,
        onDisconnected: Callback?,
        onFailed: Callback?
    ) {
        TODO("Not yet implemented")
    }

    override fun isBluetoothConnected(): Boolean {
        return CxrApi.getInstance().isBluetoothConnected
    }

    override fun setCommunicationDevice() {
        CxrApi.getInstance().setCommunicationDevice()
    }

    override fun clearCommunicationDevice() {
        CxrApi.getInstance().clearCommunicationDevice()
    }

    override fun setGlassTime(): String {
        return CxrApi.getInstance().setGlassTime().name
    }

    override fun getGlassInfo(callback: Callback?): String {
        TODO("Not yet implemented")
    }

    override fun setGlassBrightness(value: Double): String {
        return CxrApi.getInstance().setGlassBrightness(value.toInt()).name
    }

    override fun setGlassVolume(value: Double): String {
        return CxrApi.getInstance().setGlassVolume(value.toInt()).name
    }

    override fun sendExitEvent(): String {
        return CxrApi.getInstance().sendExitEvent().name
    }

    override fun sendAsrContent(text: String?): String {
        return CxrApi.getInstance().sendAsrContent(text).name
    }

    override fun notifyAsrNone(): String {
        return CxrApi.getInstance().notifyAsrNone().name
    }

    override fun notifyAsrEnd(): String {
        return CxrApi.getInstance().notifyAsrEnd().name
    }

    override fun notifyAsrError(): String {
        return CxrApi.getInstance().notifyAsrError().name
    }

    override fun notifyAiStart(): String {
        return CxrApi.getInstance().notifyAiStart().name
    }

    override fun openGlassCamera(
        witdh: Double,
        height: Double,
        quality: Double
    ): String {
        return CxrApi.getInstance().openGlassCamera(witdh.toInt(), height.toInt(), quality.toInt()).name
    }

    override fun takeGlassPhotoWithResult(
        width: Double,
        height: Double,
        quality: Double,
        onPhotoResult: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun takeGlassPhotoWithPath(
        width: Double,
        height: Double,
        quality: Double,
        onPhotoPath: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun sendTtsContent(text: String?): String {
        return CxrApi.getInstance().sendTtsContent(text).name
    }

    override fun notifyTtsAudioFinished(): String {
        return CxrApi.getInstance().notifyTtsAudioFinished().name
    }

    override fun notifyNoNetwork(): String {
        return CxrApi.getInstance().notifyNoNetwork().name
    }

    override fun notifyPicUploadError(): String {
        return CxrApi.getInstance().notifyPicUploadError().name
    }

    override fun notifyAiError(): String {
        return CxrApi.getInstance().notifyAiError().name
    }

    override fun configWordTipsText(
        textSize: Double,
        lineSpace: Double,
        mode: String?,
        startX: Double,
        startY: Double,
        width: Double,
        height: Double
    ): String {
        TODO("Not yet implemented")
    }

    override fun sendWordTipsAsrContent(text: String?): String {
        return CxrApi.getInstance().sendWordTipsAsrContent(text).name
    }

    override fun sendStream(
        streamType: String?,
        data: String?,
        filename: String?,
        onSucceed: Callback?,
        onFailed: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun openAudioRecord(streamType: Double, scene: String?): String {
        return CxrApi.getInstance().openAudioRecord(streamType.toInt(), scene).name
    }

    override fun closeAudioRecord(scene: String?): String {
        return CxrApi.getInstance().closeAudioRecord(scene).name
    }

    override fun getUnsyncNum(onUnsyncNumResult: Callback?): String {
        TODO("Not yet implemented")
    }

    override fun deinitBluetooth() {
        CxrApi.getInstance().deinitBluetooth()
    }

    override fun initWifiP2P(
        onConnected: Callback?,
        onDisconnected: Callback?,
        onFailed: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun isWifiP2PConnected(): Boolean {
        return CxrApi.getInstance().isWifiP2PConnected
    }

    override fun deinitWifiP2P(): String {
        return CxrApi.getInstance().deinitWifiP2P().name
    }

    override fun startSync(
        savePath: String?,
        mediaTypes: ReadableArray?,
        onSyncStart: Callback?,
        onSingleFileSynced: Callback?,
        onSyncFailed: Callback?,
        onSyncFinished: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun syncSingleFile(
        savePath: String?,
        mediaType: String?,
        filePath: String?,
        onSyncStart: Callback?,
        onSingleFileSynced: Callback?,
        onSyncFailed: Callback?,
        onSyncFinished: Callback?
    ): String {
        TODO("Not yet implemented")
    }

    override fun stopSync() {
        CxrApi.getInstance().stopSync()
    }

    override fun setPhotoParams(width: Double, height: Double): String {
        return CxrApi.getInstance().setPhotoParams(width.toInt(), height.toInt()).name
    }

    override fun setVideoParams(
        duration: Double,
        fps: Double,
        width: Double,
        height: Double,
        unit: Double
    ): String {
        return CxrApi.getInstance().setVideoParams(duration.toInt(), fps.toInt(), width.toInt(), height.toInt(), unit.toInt()).name
    }

    override fun setSoundEffect(text: String?): String {
        return CxrApi.getInstance().setSoundEffect(text).name
    }

    override fun setScreenOffTimeout(value: Double): String {
        return CxrApi.getInstance().setScreenOffTimeout(value.toLong()).name
    }

    override fun configTranslationText(
        textSize: Double,
        startX: Double,
        startY: Double,
        width: Double,
        height: Double
    ): String {
        return CxrApi.getInstance().configTranslationText(textSize.toInt(), startX.toInt(), startY.toInt(), width.toInt(), height.toInt()).name
    }

    override fun sendTranslationContent(
        id: Double,
        subId: Double,
        temporary: Boolean,
        finished: Boolean,
        content: String?
    ): String {
        return CxrApi.getInstance().sendTranslationContent(id.toInt(), subId.toInt(), temporary, finished, content).name
    }

    override fun stopArtc(): String {
        return CxrApi.getInstance().stopArtc().name
    }

    override fun configArtcFrame(
        width: Double,
        height: Double,
        rotate: Double,
        frameRate: Double,
        videoEncoderMode: Double
    ): String {
        return CxrApi.getInstance().configArtcFrame(width.toInt(), height.toInt(), rotate.toInt(), frameRate.toInt(), videoEncoderMode.toInt()).name
    }

    override fun sendArtcSpeakStatus(isSpeaking: Boolean): String {
        return CxrApi.getInstance().sendArtcSpeakStatus(isSpeaking).name
    }

    override fun sendArtcAsrContent(
        content: String?,
        isSentenceEnd: Boolean,
        sentenceId: Double
    ): String {
        return CxrApi.getInstance().sendArtcAsrContent(content, isSentenceEnd, sentenceId.toInt()).name
    }

    override fun sendArtcTtsContent(
        content: String?,
        isSentenceEnd: Boolean,
        sentenceId: Double
    ): String {
        return CxrApi.getInstance().sendArtcTtsContent(content, isSentenceEnd, sentenceId.toInt()).name
    }

    override fun sendGlobalMsgContent(
        iconType: Double,
        content: String?,
        playTts: Boolean
    ): String {
        return CxrApi.getInstance().sendGlobalMsgContent(iconType.toInt(), content, playTts).name
    }

    override fun sendGlobalToastContent(
        iconType: Double,
        content: String?,
        playTts: Boolean
    ): String {
        return CxrApi.getInstance().sendGlobalToastContent(iconType.toInt(), content, playTts).name
    }

    override fun sendGlobalTtsContent(content: String?): String {
        return CxrApi.getInstance().sendGlobalTtsContent(content).name
    }

    override fun controlScene(
        sceneType: String?,
        enabled: Boolean,
        extraArgs: String?
    ): String {
        return CxrApi.getInstance().controlScene(ValueUtil.CxrSceneType.valueOf(sceneType!!), enabled, extraArgs).name
    }

    override fun notifyGlassReboot(): String {
        return CxrApi.getInstance().notifyGlassReboot().name
    }

    override fun notifyGlassShutdown(): String {
        return CxrApi.getInstance().notifyGlassShutdown().name
    }

    override fun sendCustomViewIcons(icons: ReadableArray?): String {
        TODO("Not yet implemented")
    }

    override fun openCustomView(content: String?): String {
        return CxrApi.getInstance().openCustomView(content).name
    }

    override fun updateCustomView(content: String?): String {
        return CxrApi.getInstance().updateCustomView(content).name
    }

    override fun closeCustomView(): String {
        return CxrApi.getInstance().closeCustomView().name
    }

    override fun setPowerOffTimeout(value: Double): String {
        return CxrApi.getInstance().setPowerOffTimeout(value.toInt()).name
    }

    companion object {
    const val NAME = "RokidCxrClientM"
  }
}
