package pro.sihao.rokid.cxr.client

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.rokid.cxr.client.extend.CxrApi
import com.rokid.cxr.client.extend.callbacks.BluetoothStatusCallback
import com.rokid.cxr.client.utils.ValueUtil
import java.util.UUID

@ReactModule(name = RokidCxrClientMModule.NAME)
class RokidCxrClientMModule(reactContext: ReactApplicationContext) :
  NativeRokidCxrClientMSpec(reactContext) {

  companion object {
    const val NAME = "RokidCxrClientM"
    
    // Service UUID for Rokid CXR glasses
    private val GLASSES_SERVICE_UUID = UUID.fromString("00009100-0000-1000-8000-00805f9b34fb")
  }

  // BLE scanner and callback
  private var bluetoothLeScanner: BluetoothLeScanner? = null
  private var scanCallback: GlassesScanCallback? = null
  
  // Local cache for discovered devices (address -> device info)
  private val discoveredDevicesCache = mutableMapOf<String, DiscoveredDevice>()
  
  // Callbacks for React Native
  private var onScanResultCallback: Callback? = null
  private var onScanFailedCallback: Callback? = null

  override fun getName(): String {
    return NAME
  }

  init {
    CxrApi.getInstance().setSceneStatusUpdateListener {
      val data = Arguments.createMap().apply {
        putBoolean("aiAssistRunning", it.isAiAssistRunning)
        putBoolean("aiChatRunning", it.isAiChatRunning)
        putBoolean("audioRecordRunning", it.isAudioRecordRunning)
        putBoolean("brightnessRunning", it.isBrightnessRunning)
        putBoolean("hasDisplay", it.isHasDisplay)
        putBoolean("navigationRunning", it.isNavigationRunning)
        putBoolean("notesRunning", it.isNotesRunning)
        putBoolean("otaRunning", it.isOtaRunning)
        putBoolean("paymentRunning", it.isPaymentRunning)
        putBoolean("phoneCallRunning", it.isPhoneCallRunning)
        putBoolean("translateRunning", it.isTranslateRunning)
        putBoolean("videoRecordRunning", it.isVideoRecordRunning)
        putBoolean("wordTipsRunning", it.isWordTipsRunning)
        putBoolean("customViewRunning", it.isCustomViewRunning)
      }
      emitOnSceneStatusUpdated(data)
    }
  }

  /**
   * Data class to hold discovered device information
   * Includes the native BluetoothDevice object for later use in connection
   */
  private data class DiscoveredDevice(
    val name: String?,
    val address: String,
    val rssi: Int,
    val nativeDevice: BluetoothDevice
  )

  /**
   * Scan callback for BLE scanning with service UUID filter
   */
  private inner class GlassesScanCallback : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val device = result.device
      val address = device.address ?: return
      
      // Check if device advertises the target service UUID
      val hasTargetService = result.scanRecord?.serviceUuids?.any {
        it.uuid == GLASSES_SERVICE_UUID
      } == true
      
      if (!hasTargetService) {
        return
      }
      
      // Check cache for duplicates
      if (discoveredDevicesCache.containsKey(address)) {
        return
      }
      
      // Add to cache with native device
      val discoveredDevice = DiscoveredDevice(
        name = device.name ?: "Unknown Device",
        address = address,
        rssi = result.rssi,
        nativeDevice = device  // Store native device for later use
      )
      discoveredDevicesCache[address] = discoveredDevice
      
      // Convert to WritableMap and invoke callback
      val deviceMap = Arguments.createMap().apply {
        putString("name", discoveredDevice.name)
        putString("address", discoveredDevice.address)
      }
      
      onScanResultCallback?.invoke(deviceMap)
    }

    override fun onScanFailed(errorCode: Int) {
      onScanFailedCallback?.invoke(errorCode)
    }
  }

  /**
   * Check if required Bluetooth permissions are granted
   */
  private fun hasBluetoothPermissions(): Boolean {
    val hasScanPermission = ActivityCompat.checkSelfPermission(
      reactApplicationContext,
      Manifest.permission.BLUETOOTH_SCAN
    ) == PackageManager.PERMISSION_GRANTED
    
    val hasConnectPermission = ActivityCompat.checkSelfPermission(
      reactApplicationContext,
      Manifest.permission.BLUETOOTH_CONNECT
    ) == PackageManager.PERMISSION_GRANTED
    
    return hasScanPermission && hasConnectPermission
  }

  /**
   * Get Bluetooth adapter
   */
  private fun getBluetoothAdapter(): BluetoothAdapter? {
    val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return bluetoothManager?.adapter
  }

    override fun startScanGlasses(
        onScanResult: Callback?,
        onScanFailed: Callback?
    ) {
        // Check permissions
        if (!hasBluetoothPermissions()) {
            onScanFailed?.invoke(1) // Error code 1: Permission denied
            return
        }

        // Get Bluetooth adapter
        val bluetoothAdapter = getBluetoothAdapter()
        if (bluetoothAdapter == null) {
            onScanFailed?.invoke(2) // Error code 2: Bluetooth not available
            return
        }

        if (!bluetoothAdapter.isEnabled) {
            onScanFailed?.invoke(3) // Error code 3: Bluetooth not enabled
            return
        }

        // Store callbacks
        onScanResultCallback = onScanResult
        onScanFailedCallback = onScanFailed

        // Clear previous cache
        discoveredDevicesCache.clear()

        // Create scan filter for the target service UUID
        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(GLASSES_SERVICE_UUID))
            .build()

        // Configure scan settings
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        // Get BLE scanner
        bluetoothLeScanner = bluetoothAdapter.bluetoothLeScanner
        if (bluetoothLeScanner == null) {
            onScanFailed?.invoke(4) // Error code 4: BLE scanner not available
            return
        }

        // Create and start scan callback
        scanCallback = GlassesScanCallback()
        
        try {
            bluetoothLeScanner?.startScan(
                listOf(scanFilter),
                scanSettings,
                scanCallback
            )
        } catch (e: SecurityException) {
            onScanFailed?.invoke(1) // Permission denied
        } catch (e: Exception) {
            onScanFailed?.invoke(5) // Error code 5: Scan failed
        }
    }

    override fun stopScanGlasses() {
        try {
            scanCallback?.let { callback ->
                bluetoothLeScanner?.stopScan(callback)
            }
        } catch (e: SecurityException) {
            // Ignore permission errors on stop
        } catch (e: Exception) {
            // Ignore other errors on stop
        } finally {
            // Clean up
            scanCallback = null
            bluetoothLeScanner = null
            onScanResultCallback = null
            onScanFailedCallback = null
        }
    }

    override fun initBluetooth(
        device: ReadableMap?,
        onConnectionInfoCb: Callback?,
        onConnectedCb: Callback?,
        onDisconnectedCb: Callback?,
        onFailedCb: Callback?
    ) {
        // Validate device parameter
        if (device == null) {
            onFailedCb?.invoke(ValueUtil.CxrBluetoothErrorCode.PARAM_INVALID.name)
            return
        }
        
        val deviceAddress = device.getString("address")
        if (deviceAddress == null) {
            onFailedCb?.invoke(ValueUtil.CxrBluetoothErrorCode.PARAM_INVALID.name)
            return
        }
        
        // Find native device in local cache by address
        val cachedDevice = discoveredDevicesCache[deviceAddress]
        if (cachedDevice == null) {
            onFailedCb?.invoke(ValueUtil.CxrBluetoothErrorCode.BLE_CONNECT_FAILED.name)
            return
        }
        
        // Pass the native device from cache to CxrApi
        CxrApi.getInstance().initBluetooth(reactApplicationContext, cachedDevice.nativeDevice, object : BluetoothStatusCallback {
            override fun onConnectionInfo(
                p0: String?,
                p1: String?,
                p2: String?,
                p3: Int
            ) {
                onConnectionInfoCb?.invoke(p0, p1, p2, p3)
            }

            override fun onConnected() {
                onConnectedCb?.invoke()
            }

            override fun onDisconnected() {
                onDisconnectedCb?.invoke()
            }

            override fun onFailed(p0: ValueUtil.CxrBluetoothErrorCode?) {
                onFailedCb?.invoke(p0?.name)
            }

        })
    }

    override fun updateRokidAccount(account: String?) {
        CxrApi.getInstance().updateRokidAccount(account)
    }

    override fun connectBluetooth(
        v2: String?,
        v3: String?,
        onConnectionInfoCb: Callback?,
        onConnectedCb: Callback?,
        onDisconnectedCb: Callback?,
        onFailedCb: Callback?
    ) {
        CxrApi.getInstance().connectBluetooth(reactApplicationContext, v2, v3, object : BluetoothStatusCallback {
            override fun onConnectionInfo(
                p0: String?,
                p1: String?,
                p2: String?,
                p3: Int
            ) {
                onConnectionInfoCb?.invoke(p0, p1, p2, p3)
            }

            override fun onConnected() {
                onConnectedCb?.invoke()
            }

            override fun onDisconnected() {
                onDisconnectedCb?.invoke()
            }

            override fun onFailed(p0: ValueUtil.CxrBluetoothErrorCode?) {
                onFailedCb?.invoke(p0)
            }

        })
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
        var resultStatus = ValueUtil.CxrStatus.REQUEST_FAILED
        
        CxrApi.getInstance().getGlassInfo { status, info ->
            resultStatus = status
            
            if (callback != null && info != null) {
                val infoMap = Arguments.createMap().apply {
                    putString("deviceName", info.deviceName)
                    putInt("batteryLevel", info.batteryLevel)
                    putBoolean("isCharging", info.isCharging)
                    putString("devicePanel", info.devicePanel)
                    putInt("brightness", info.brightness)
                    putInt("volume", info.volume)
                    putString("wearingStatus", info.wearingStatus)
                    putString("deviceKey", info.deviceKey)
                    putString("deviceSecret", info.deviceSecret)
                    putString("deviceTypeId", info.deviceTypeId)
                    putString("deviceId", info.deviceId)
                    putString("deviceSeed", info.deviceSeed)
                    putString("otaCheckUrl", info.otaCheckUrl)
                    putString("otaCheckApi", info.otaCheckApi)
                    putString("assistVersionName", info.assistVersionName)
                    putLong("assistVersionCode", info.assistVersionCode)
                    putString("systemVersion", info.systemVersion)
                }
                callback.invoke(status.name, infoMap)
            }
        }
        
        return resultStatus.name
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
        width: Double,
        height: Double,
        quality: Double
    ): String {
        return CxrApi.getInstance().openGlassCamera(width.toInt(), height.toInt(), quality.toInt()).name
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
        // Validate sceneType parameter to prevent NullPointerException
        if (sceneType == null) {
            return ValueUtil.CxrStatus.REQUEST_FAILED.name
        }
        
        return try {
            CxrApi.getInstance().controlScene(ValueUtil.CxrSceneType.valueOf(sceneType), enabled, extraArgs).name
        } catch (e: IllegalArgumentException) {
            // Handle invalid scene type enum value
            ValueUtil.CxrStatus.REQUEST_FAILED.name
        }
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
}
