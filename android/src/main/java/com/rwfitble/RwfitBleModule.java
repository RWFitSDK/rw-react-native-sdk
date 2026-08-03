package com.rwfitble;

import android.app.Activity;
import android.content.Context;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.KeyEvent;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.example.blesdk.DHBleSdk;
import com.example.blesdk.bean.function.*;
import com.example.blesdk.bean.sync.*;
import com.example.blesdk.ble.ScanBleService;
import com.example.blesdk.ble.bean.BleDevice;
import com.example.blesdk.callback.OnFileTransferCallback;
import com.example.blesdk.callback.data.*;
import com.example.blesdk.callback.status.*;
import com.example.blesdk.utils.BlueToothUtils;
import com.example.blesdk.utils.BleActivityMode;
import com.example.blesdk.utils.CmdConstants;
import com.example.blesdk.utils.WorkoutControlType;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;


/**
 * RWFIT BLE TurboModule (Android).
 * SDK 业务实现与 Flutter 桥保持一致，仅替换为 React Native Codegen 外壳。
 */
public class RwfitBleModule extends NativeRwfitBleSpec {

    private static final String TAG = "RwfitBleModule";
    private static final String PLUGIN_VERSION = "0.0.3";

    private Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());

    public RwfitBleModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    public static final String NAME = NativeRwfitBleSpec.NAME;

    // 长期订阅引用（切换/重设时先 dispose 旧的，避免事件叠加）
    private HealthDataBroCallback realtimeDataCallback;
    private HealthDataControlCallback realtimeMeasureStateCallback;
    private SportDataPushCallback workoutRealtimeCallback;
    private TakePhotoCallback takePhotoEventCallback;
    private MusicPushSettingCallback musicControlEventCallback;
    private CallRemindCallback callControlEventCallback;
    private HrBoActualReminderCallback healthAlertEventCallback;
    private TouchEventCallback touchEventCallback;
    private FactoryTestCallback factoryTestCallback;
    private SensorRawDataCallback sensorRawDataCallback;
    private SensorRawControlCallback sensorRawControlCallback;

    private RWFitCallbackManager cb() {
        RWFitCallbackManager m = RWFitCallbackManager.getInstance();
        m.setPlugin(this);
        return m;
    }

    @Override
    public void invalidate() {
        disposePersistentCallbacks();
        RWFitCallbackManager.getInstance().setPlugin(null);
        activity = null;
        super.invalidate();
    }

    // ==================== 方法分发 ====================

    private void dispatch(String method, ReadableMap args, Promise promise) {
        final MethodCall call = new MethodCall(method, args != null ? args.toHashMap() : null);
        final Reply result = new Reply(promise, main);
        try {
            switch (call.method) {
                case "initSDK": initSDK(result); break;
                case "getSDKVersion": {
                    Map<String, Object> r = success();
                    r.put("version", DHBleSdk.INSTANCE.getSDKVersion());
                    result.success(r);
                    break;
                }
                case "getPluginVersion": {
                    Map<String, Object> r = success();
                    r.put("pluginVersion", PLUGIN_VERSION + "_" + DHBleSdk.INSTANCE.getSDKVersion());
                    result.success(r);
                    break;
                }
                case "isBleConnected": {
                    Map<String, Object> r = success();
                    r.put("connected", DHBleSdk.INSTANCE.isBleConnected());
                    result.success(r);
                    break;
                }
                case "startScan": {
                    // Flutter 扫描只返回 SDK 支持的设备；false 表示普通界面扫描，
                    // 不能把对外参数误传成原生的 isAutoConnect。
                    ScanBleService.getService().startScan(false, null);
                    result.success(success());
                    break;
                }
                case "stopScan":
                    ScanBleService.getService().stopScan();
                    result.success(success());
                    break;
                case "connectDevice":
                case "reconnectDevice": {
                    if (connectDevice(call, result)) {
                        result.success(success());
                    }
                    break;
                }
                case "disconnect":
                    DHBleSdk.INSTANCE.disconnect();
                    result.success(success());
                    break;
                case "iOSSetBindedStatus": // Android 无副作用
                    result.success(success());
                    break;
                case "getPower": getPower(result); break;
                case "getFirmwareVersion": getFirmwareVersion(result); break;
                case "controlHealthData": controlHealthData(call, result); break;
                case "controlFindDevice": controlFindDevice(result); break;
                case "controlTakePhoto": controlTakePhoto(call, result); break;
                case "controlPhone": controlPhone(call, result); break;
                case "setPowerOff": {
                    Object rawType = call.argument("type");
                    int type = rawType != null ? asInt(rawType) : 1;
                    DHBleSdk.INSTANCE.setPowerOffJL(type);
                    result.success(success());
                    break;
                }
                case "syncAllHealthData":
                    DHBleSdk.INSTANCE.syncAllHealthData(cb());
                    result.success(success());
                    break;
                case "removeHealthDataCallback":
                    DHBleSdk.INSTANCE.removeHealthDataCallBack(cb());
                    result.success(success());
                    break;
                case "ringOta": ringOta(call, result); break;
                case "unbind": unbind(result); break;
                // iOS 专用，Android no-op
                case "setNotificationSwitch":
                    result.success(success());
                    break;
                case "getNotificationSwitch": {
                    Map<String, Object> r = success();
                    r.put("switches", new HashMap<>());
                    result.success(r);
                    break;
                }
                // ---- 设备信息 ----
                case "setUserInfo": setUserInfo(call, result); break;
                case "setTimeFormat": setTimeFormat(call, result); break;
                case "getFunctionList": getFunctionList(result); break;
                case "setRingBtName": setRingBtName(call, result); break;
                case "getMuslimCountEnabled": getMuslimCountEnabled(result); break;
                case "setMuslimCountEnabled": setMuslimCountEnabled(call, result); break;
                case "getHeartRateAlert": getHeartRateAlert(result); break;
                case "setHeartRateAlert": setHeartRateAlert(call, result); break;
                case "getBloodOxygenAlert": getBloodOxygenAlert(result); break;
                case "setBloodOxygenAlert": setBloodOxygenAlert(call, result); break;
                // ---- 多运动 ----
                case "getWorkoutState": getWorkoutState(result); break;
                case "controlWorkout": controlWorkout(call, result); break;
                case "setWorkoutRealtimeEnabled": setWorkoutRealtimeEnabled(call, result); break;
                case "getWorkoutReports": getWorkoutReports(result); break;
                // ---- 全天检测 ----
                case "getTimedHeartRate": getTimed(result, "hr"); break;
                case "setTimedHeartRate": setTimed(call, result, "hr"); break;
                case "getTimedBloodOxygen": getTimed(result, "bo"); break;
                case "setTimedBloodOxygen": setTimed(call, result, "bo"); break;
                case "getTimedHRV": getTimed(result, "hrv"); break;
                case "setTimedHRV": setTimed(call, result, "hrv"); break;
                case "getTimedStress": getTimed(result, "stress"); break;
                case "setTimedStress": setTimed(call, result, "stress"); break;
                case "getTimedBloodSugar": getTimed(result, "sugar"); break;
                case "setTimedBloodSugar": setTimed(call, result, "sugar"); break;
                case "getTimedBloodPressure": getTimed(result, "bp"); break;
                case "setTimedBloodPressure": setTimed(call, result, "bp"); break;
                case "getTimedBodyTemperature": getTimed(result, "temp"); break;
                case "setTimedBodyTemperature": setTimed(call, result, "temp"); break;
                case "getTimedPPG": getTimed(result, "ppg"); break;
                case "setTimedPPG": setTimed(call, result, "ppg"); break;
                // ---- 闹钟 ----
                case "getAlarm": getAlarm(result); break;
                case "setAlarm": setAlarm(call, result); break;
                case "deleteAllAlarm": deleteAllAlarm(result); break;
                // ---- 屏幕 ----
                case "getRaiseBrightScreen": getRaiseBrightScreen(result); break;
                case "setRaiseBrightScreen": setRaiseBrightScreen(call, result); break;
                case "getBrightScreenTime": getBrightScreenTime(result); break;
                case "setBrightScreenTime": setBrightScreenTime(call, result); break;
                case "getBrightScreenSleepTime": getBrightScreenSleepTime(result); break;
                case "setBrightScreenSleepTime": setBrightScreenSleepTime(call, result); break;
                case "getRingLedLevel": getRingLedLevel(result); break;
                case "setRingLedLevel": setRingLedLevel(call, result); break;
                // ---- 视频 HID / HID 配对 ----
                case "getVideoHid": getVideoHid(result); break;
                case "setVideoHid": setVideoHid(call, result); break;
                case "createOrRemoveBond": {
                    Object rawType = call.argument("type");
                    String mac = call.argument("mac");
                    int type = rawType != null ? asInt(rawType) : 0;
                    boolean ok = BlueToothUtils.INSTANCE.createOrRemoveBond(type, mac);
                    Map<String, Object> r = success();
                    r.put("result", ok);
                    result.success(r);
                    break;
                }
                // ---- 佩戴方向 ----
                case "getRingWearDir": getRingWearDir(result); break;
                case "setRingWearHand": setRingWearHand(call, result); break;
                // ---- 振动 ----
                case "getVibrationCount": getVibrationCount(result); break;
                case "setVibrationCount": setVibrationCount(call, result); break;
                case "getAlarmVibrationDuration": getAlarmVibrationDuration(result); break;
                case "setAlarmVibrationDuration": setAlarmVibrationDuration(call, result); break;
                case "getVibrationInterval": getVibrationInterval(result); break;
                case "setVibrationInterval": setVibrationInterval(call, result); break;
                case "startHeartRateCalibration": startHeartRateCalibration(result); break;
                case "getFallDetect": getFallDetect(result); break;
                case "setFallDetect": setFallDetect(call, result); break;
                case "getCountReminderInterval": getCountReminderInterval(result); break;
                case "setCountReminderInterval": setCountReminderInterval(call, result); break;
                // ---- 传感器原始数据 ----
                case "controlSensorRaw": controlSensorRaw(call, result); break;
                case "getSensorRawHistory": getSensorRawHistory(result); break;
                // ---- 消息推送（Android 专用）----
                case "pushMessage": pushMessage(call, result); break;
                default:
                    result.notImplemented();
            }
        } catch (Exception e) {
            Log.e(TAG, "dispatch " + call.method + " error", e);
            result.error(-1, e.getMessage());
        }
    }

    // ==================== Codegen 方法外壳 ====================

    private void call(String method, Promise promise) { dispatch(method, null, promise); }
    private void call(String method, ReadableMap args, Promise promise) { dispatch(method, args, promise); }

    @Override public void initSDK(Promise p) { call("initSDK", p); }
    @Override public void getSDKVersion(Promise p) { call("getSDKVersion", p); }
    @Override public void getPluginVersion(Promise p) { call("getPluginVersion", p); }
    @Override public void isBleConnected(Promise p) { call("isBleConnected", p); }
    @Override public void startScan(Promise p) { call("startScan", p); }
    @Override public void stopScan(Promise p) { call("stopScan", p); }
    @Override public void connectDevice(ReadableMap a, Promise p) { call("connectDevice", a, p); }
    @Override public void reconnectDevice(ReadableMap a, Promise p) { call("reconnectDevice", a, p); }
    @Override public void disconnect(Promise p) { call("disconnect", p); }
    @Override public void iOSSetBindedStatus(ReadableMap a, Promise p) { call("iOSSetBindedStatus", a, p); }
    @Override public void getPower(Promise p) { call("getPower", p); }
    @Override public void getFirmwareVersion(Promise p) { call("getFirmwareVersion", p); }
    @Override public void setUserInfo(ReadableMap a, Promise p) { call("setUserInfo", a, p); }
    @Override public void setTimeFormat(ReadableMap a, Promise p) { call("setTimeFormat", a, p); }
    @Override public void getFunctionList(Promise p) { call("getFunctionList", p); }
    @Override public void setRingBtName(ReadableMap a, Promise p) { call("setRingBtName", a, p); }
    @Override public void getTimedHeartRate(Promise p) { call("getTimedHeartRate", p); }
    @Override public void setTimedHeartRate(ReadableMap a, Promise p) { call("setTimedHeartRate", a, p); }
    @Override public void getTimedBloodOxygen(Promise p) { call("getTimedBloodOxygen", p); }
    @Override public void setTimedBloodOxygen(ReadableMap a, Promise p) { call("setTimedBloodOxygen", a, p); }
    @Override public void getTimedHRV(Promise p) { call("getTimedHRV", p); }
    @Override public void setTimedHRV(ReadableMap a, Promise p) { call("setTimedHRV", a, p); }
    @Override public void getTimedStress(Promise p) { call("getTimedStress", p); }
    @Override public void setTimedStress(ReadableMap a, Promise p) { call("setTimedStress", a, p); }
    @Override public void getTimedBloodSugar(Promise p) { call("getTimedBloodSugar", p); }
    @Override public void setTimedBloodSugar(ReadableMap a, Promise p) { call("setTimedBloodSugar", a, p); }
    @Override public void getTimedBloodPressure(Promise p) { call("getTimedBloodPressure", p); }
    @Override public void setTimedBloodPressure(ReadableMap a, Promise p) { call("setTimedBloodPressure", a, p); }
    @Override public void getTimedBodyTemperature(Promise p) { call("getTimedBodyTemperature", p); }
    @Override public void setTimedBodyTemperature(ReadableMap a, Promise p) { call("setTimedBodyTemperature", a, p); }
    @Override public void getTimedPPG(Promise p) { call("getTimedPPG", p); }
    @Override public void setTimedPPG(ReadableMap a, Promise p) { call("setTimedPPG", a, p); }
    @Override public void controlHealthData(ReadableMap a, Promise p) { call("controlHealthData", a, p); }
    @Override public void getWorkoutState(Promise p) { call("getWorkoutState", p); }
    @Override public void controlWorkout(ReadableMap a, Promise p) { call("controlWorkout", a, p); }
    @Override public void setWorkoutRealtimeEnabled(ReadableMap a, Promise p) { call("setWorkoutRealtimeEnabled", a, p); }
    @Override public void getWorkoutReports(Promise p) { call("getWorkoutReports", p); }
    @Override public void controlFindDevice(Promise p) { call("controlFindDevice", p); }
    @Override public void setPowerOff(ReadableMap a, Promise p) { call("setPowerOff", a, p); }
    @Override public void controlTakePhoto(ReadableMap a, Promise p) { call("controlTakePhoto", a, p); }
    @Override public void controlPhone(ReadableMap a, Promise p) { call("controlPhone", a, p); }
    @Override public void getMuslimCountEnabled(Promise p) { call("getMuslimCountEnabled", p); }
    @Override public void setMuslimCountEnabled(ReadableMap a, Promise p) { call("setMuslimCountEnabled", a, p); }
    @Override public void getHeartRateAlert(Promise p) { call("getHeartRateAlert", p); }
    @Override public void setHeartRateAlert(ReadableMap a, Promise p) { call("setHeartRateAlert", a, p); }
    @Override public void getBloodOxygenAlert(Promise p) { call("getBloodOxygenAlert", p); }
    @Override public void setBloodOxygenAlert(ReadableMap a, Promise p) { call("setBloodOxygenAlert", a, p); }
    @Override public void getVibrationInterval(Promise p) { call("getVibrationInterval", p); }
    @Override public void setVibrationInterval(ReadableMap a, Promise p) { call("setVibrationInterval", a, p); }
    @Override public void startHeartRateCalibration(Promise p) { call("startHeartRateCalibration", p); }
    @Override public void getFallDetect(Promise p) { call("getFallDetect", p); }
    @Override public void setFallDetect(ReadableMap a, Promise p) { call("setFallDetect", a, p); }
    @Override public void getCountReminderInterval(Promise p) { call("getCountReminderInterval", p); }
    @Override public void setCountReminderInterval(ReadableMap a, Promise p) { call("setCountReminderInterval", a, p); }
    @Override public void controlSensorRaw(ReadableMap a, Promise p) { call("controlSensorRaw", a, p); }
    @Override public void getSensorRawHistory(Promise p) { call("getSensorRawHistory", p); }
    @Override public void getAlarm(Promise p) { call("getAlarm", p); }
    @Override public void setAlarm(ReadableMap a, Promise p) { call("setAlarm", a, p); }
    @Override public void deleteAllAlarm(Promise p) { call("deleteAllAlarm", p); }
    @Override public void getRaiseBrightScreen(Promise p) { call("getRaiseBrightScreen", p); }
    @Override public void setRaiseBrightScreen(ReadableMap a, Promise p) { call("setRaiseBrightScreen", a, p); }
    @Override public void getBrightScreenTime(Promise p) { call("getBrightScreenTime", p); }
    @Override public void setBrightScreenTime(ReadableMap a, Promise p) { call("setBrightScreenTime", a, p); }
    @Override public void getBrightScreenSleepTime(Promise p) { call("getBrightScreenSleepTime", p); }
    @Override public void setBrightScreenSleepTime(ReadableMap a, Promise p) { call("setBrightScreenSleepTime", a, p); }
    @Override public void getRingLedLevel(Promise p) { call("getRingLedLevel", p); }
    @Override public void setRingLedLevel(ReadableMap a, Promise p) { call("setRingLedLevel", a, p); }
    @Override public void getVideoHid(Promise p) { call("getVideoHid", p); }
    @Override public void setVideoHid(ReadableMap a, Promise p) { call("setVideoHid", a, p); }
    @Override public void createOrRemoveBond(ReadableMap a, Promise p) { call("createOrRemoveBond", a, p); }
    @Override public void getRingWearDir(Promise p) { call("getRingWearDir", p); }
    @Override public void setRingWearHand(ReadableMap a, Promise p) { call("setRingWearHand", a, p); }
    @Override public void getVibrationCount(Promise p) { call("getVibrationCount", p); }
    @Override public void setVibrationCount(ReadableMap a, Promise p) { call("setVibrationCount", a, p); }
    @Override public void getAlarmVibrationDuration(Promise p) { call("getAlarmVibrationDuration", p); }
    @Override public void setAlarmVibrationDuration(ReadableMap a, Promise p) { call("setAlarmVibrationDuration", a, p); }
    @Override public void syncAllHealthData(Promise p) { call("syncAllHealthData", p); }
    @Override public void removeHealthDataCallback(Promise p) { call("removeHealthDataCallback", p); }
    @Override public void ringOta(ReadableMap a, Promise p) { call("ringOta", a, p); }
    @Override public void unbind(Promise p) { call("unbind", p); }
    @Override public void pushMessage(ReadableMap a, Promise p) { call("pushMessage", a, p); }
    @Override public void setNotificationSwitch(ReadableMap a, Promise p) { call("setNotificationSwitch", a, p); }
    @Override public void getNotificationSwitch(Promise p) { call("getNotificationSwitch", p); }

    // ==================== 方法实现（移植自 Flutter bridge）====================

    private void initSDK(Reply result) {
        activity = getCurrentActivity();
        // TurboModule may be created before MainActivity reaches RESUMED (for
        // example during a cold start from the lock screen). Both native SDK
        // entry points only require Context, so do not make initialization
        // depend on that lifecycle race.
        Context context = activity != null ? activity : getReactApplicationContext();
        DHBleSdk.INSTANCE.initSDK(context);
        DHBleSdk.INSTANCE.setConnectBleCallback(cb());
        ScanBleService.getService().initBle(context);
        ScanBleService.getService().registerScanBleCallback(cb());
        registerPersistentCallbacks();
        result.success(success());
    }

    private boolean connectDevice(MethodCall call, Reply result) {
        String mac = s(call, "mac");
        if (mac.trim().isEmpty()) {
            result.error(-1, "mac is required on Android");
            return false;
        }
        BleDevice device = new BleDevice();
        device.setBleName(s(call, "name"));
        device.setBleMac(mac);
        device.setBleRssi(i(call, "rssi"));
        DHBleSdk.INSTANCE.setConnectBleCallback(cb());
        DHBleSdk.INSTANCE.connectDeviceWithModel(device);
        return true;
    }

    private void getPower(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new PowerCallback() {
            @Override public void onSuccess() {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getPower failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onResult(PowerBean data) {
                if (data != null) {
                    Map<String, Object> r = success();
                    r.put("power", data.getPower());
                    result.success(r);
                    DHBleSdk.INSTANCE.dispose(this);
                }
            }
        });
        DHBleSdk.INSTANCE.getPowerJL();
    }

    private void getFirmwareVersion(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new FirmwareCallback() {
            @Override public void onSuccess() {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getFirmwareVersion failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onResult(FirmVersionBean data) {
                if (data != null) {
                    Map<String, Object> r = success();
                    r.put("deviceClazz", data.getDeviceClazz() != null ? data.getDeviceClazz() : "");
                    r.put("deviceNo", data.getDeviceNo() != null ? data.getDeviceNo() : "");
                    r.put("uiVersion", data.getUiVersion() != null ? data.getUiVersion() : "");
                    result.success(r);
                    DHBleSdk.INSTANCE.dispose(this);
                }
            }
        });
        DHBleSdk.INSTANCE.getFirmwareVersionJL();
    }

    // ==================== 多运动 ====================

    private void getWorkoutState(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new SportGetControlCallback() {
            @Override public void onSuccess() {}

            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getWorkoutState failed");
                DHBleSdk.INSTANCE.dispose(this);
            }

            @Override public void onResult(NewSportBean data) {
                if (data == null) {
                    result.error(-1, "getWorkoutState returned empty data");
                } else {
                    Map<String, Object> response = success();
                    response.put("sportType",
                            data.getSportType() != null ? data.getSportType().getValue() : 0);
                    response.put("controlType",
                            data.getStatus() != null ? data.getStatus().getValue() : -1);
                    result.success(response);
                }
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.controlGetSportJLData();
    }

    private void controlWorkout(MethodCall call, final Reply result) {
        int rawSportType = i(call, "sportType");
        if (rawSportType < 7 || rawSportType > 161) {
            result.error(-1, "sportType must be between 7 and 161");
            return;
        }
        BleActivityMode sportType = BleActivityMode.Companion.fromValue(rawSportType);
        WorkoutControlType controlType =
                WorkoutControlType.Companion.fromValue(i(call, "controlType"));
        if (sportType == null || controlType == null) {
            result.error(-1, "invalid sportType or controlType");
            return;
        }

        DHBleSdk.INSTANCE.subscribeData(new SportControlCallback() {
            @Override public void onResult(NewSportBean data) {
                // 等设备返回实际控制结果后再完成 Future，避免紧接着查询到旧状态。
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }

            @Override public void onFail(int errorCode) {
                result.error(errorCode, "controlWorkout failed");
                DHBleSdk.INSTANCE.dispose(this);
            }

            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.controlSportJL(sportType, controlType);
    }

    private void setWorkoutRealtimeEnabled(MethodCall call, Reply result) {
        boolean enabled = b(call, "enabled");
        if (workoutRealtimeCallback != null) {
            DHBleSdk.INSTANCE.dispose(workoutRealtimeCallback);
            workoutRealtimeCallback = null;
        }

        if (enabled) {
            workoutRealtimeCallback = new SportDataPushCallback() {
                @Override public void onSuccess() {}
                @Override public void onFail(int errorCode) {}

                @Override public void onResult(SportDataPushBean data) {
                    if (data == null) return;
                    JSONObject event = new JSONObject();
                    event.put("duration", asInt(data.gettActivityTime()));
                    event.put("steps", asInt(data.gettActivitySteps()));
                    event.put("distance", asInt(data.gettActivityDistance()));
                    // 当前 Android AAR 未除协议的 10 倍缩放，先在桥接层与 iOS 对齐。
                    event.put("calorie", asInt(data.gettActivityCalorie()) / 10);
                    event.put("heartRate", asInt(data.gettActivityHr()));
                    // Android SportDataPushCallback 对应 iOS 的 BLE_KEY_APP_WORKOUT_DATA。
                    event.put("dataType", 0x0223);
                    fireEvent("rwfit:workoutRealtimeData", event);
                }
            };
            DHBleSdk.INSTANCE.subscribeData(workoutRealtimeCallback);
        }

        DHBleSdk.INSTANCE.subscribeData(new SportDataPushCallback() {
            @Override public void onResult(SportDataPushBean data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setWorkoutRealtimeEnabled failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.setExerciseMore(enabled ? 1 : 0);
    }

    private void getWorkoutReports(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new Sport3ResultCallback() {
            @Override public void onSuccess() {}

            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getWorkoutReports failed");
                DHBleSdk.INSTANCE.dispose(this);
            }

            @Override public void onResult(List<SportResultBean> data) {
                JSONArray reports = new JSONArray();
                if (data != null) {
                    for (SportResultBean item : data) {
                        if (item != null) reports.add(workoutReportPayload(item));
                    }
                }
                Map<String, Object> response = success();
                response.put("data", toCodecSafe(reports));
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.getSport3ResultJL();
    }

    private JSONObject workoutReportPayload(SportResultBean item) {
        long startTime = item.getStartTime();
        long endTime = item.getEndTime();
        if (endTime <= 0 && startTime > 0) endTime = startTime + item.getExerciseTime();

        JSONObject report = new JSONObject();
        report.put("startTime", startTime);
        report.put("endTime", endTime);
        report.put("date", workoutDate(startTime));
        report.put("sportType", item.getWorkModel());
        report.put("duration", item.getExerciseTime());
        report.put("step", item.getStep());
        report.put("distance", item.getDistance());
        // 当前 Android AAR 保留协议原始 10 倍值；Flutter 对外按 iOS 的 Cal 返回。
        report.put("calorie", item.getCalorie() / 10);
        report.put("height", item.getHeight());
        report.put("pressure", item.getBarometricPressure());
        report.put("cadence", item.getCadence());
        // AAR 按大端整数读取了线序中的小端 IEEE-754 float，先反转字节再按位还原。
        report.put("speed", (double) Float.intBitsToFloat(
                Integer.reverseBytes(item.getSpeed())));
        report.put("pace", item.getPace());
        report.put("averageHeartRate", item.getAverageHr());
        report.put("maxHeartRate", item.getMaxHr());
        report.put("minHeartRate", item.getMinHr());
        report.put("maxCadence", item.getMaxCadence());
        report.put("minCadence", item.getMinCadence());
        report.put("maxPace", item.getMaxPace());
        report.put("minPace", item.getMinPace());
        report.put("heartRateCount", item.getHrCount());
        report.put("viewType", item.getViewType());
        report.put("heartRateItems", workoutValueItems(item.getNewSportHrs()));
        report.put("pacePerKmItems", workoutValueItems(item.getPacePerKmList()));
        return report;
    }

    private String workoutDate(long timestampSeconds) {
        if (timestampSeconds <= 0) return "";
        return new SimpleDateFormat("yyyyMMdd", Locale.US)
                .format(new Date(timestampSeconds * 1000L));
    }

    private JSONArray workoutValueItems(String raw) {
        JSONArray result = new JSONArray();
        if (raw == null || raw.trim().isEmpty()) return result;
        try {
            Object parsed = JSON.parse(raw);
            if (parsed instanceof JSONArray) {
                int fallbackIndex = 0;
                for (Object value : (JSONArray) parsed) {
                    JSONObject item = new JSONObject();
                    if (value instanceof Map) {
                        Map<?, ?> map = (Map<?, ?>) value;
                        item.put("index", asInt(map.get("index")));
                        item.put("value", asInt(map.get("value")));
                    } else {
                        item.put("index", fallbackIndex);
                        item.put("value", asInt(value));
                    }
                    result.add(item);
                    fallbackIndex++;
                }
                return result;
            }
        } catch (Exception ignored) {
            // 兼容旧固件用逗号分隔纯数值的格式。
        }

        String normalized = raw.trim().replace("[", "").replace("]", "");
        if (normalized.isEmpty()) return result;
        String[] values = normalized.split(",");
        for (int index = 0; index < values.length; index++) {
            try {
                JSONObject item = new JSONObject();
                item.put("index", index);
                item.put("value", Integer.parseInt(values[index].trim()));
                result.add(item);
            } catch (NumberFormatException ignored) {
                Log.w(TAG, "ignore invalid workout item: " + values[index]);
            }
        }
        return result;
    }

    private void controlHealthData(MethodCall call, final Reply result) {
        String keyName = call.argument("key");
        int state = i(call, "state");

        byte key;
        switch (keyName != null ? keyName : "") {
            case "JL_HR_DATA_TRANSFER_KEY": key = CmdConstants.JL_HR_DATA_TRANSFER_KEY; break;
            case "JL_BO_DATA_TRANSFER_KEY": key = CmdConstants.JL_BO_DATA_TRANSFER_KEY; break;
            case "JL_HRV_DATA_TRANSFER_KEY": key = CmdConstants.JL_HRV_DATA_TRANSFER_KEY; break;
            case "JL_PRESSURE_DATA_TRANSFER_KEY": key = CmdConstants.JL_PRESSURE_DATA_TRANSFER_KEY; break;
            case "JL_BLOODSUGAR_DATA_TRANSFER_KEY": key = CmdConstants.JL_BLOODSUGAR_DATA_TRANSFER_KEY; break;
            case "JL_BP_DATA_TRANSFER_KEY": key = CmdConstants.JL_BP_DATA_TRANSFER_KEY; break;
            default:
                result.error(-1, "unknown key: " + keyName);
                return;
        }

        if (realtimeDataCallback != null) {
            DHBleSdk.INSTANCE.dispose(realtimeDataCallback);
            realtimeDataCallback = null;
        }

        // state=1 开启时才订阅实时数据回调；state=0 停止时只 dispose、不再重新订阅
        if (state == 1) {
            realtimeDataCallback = new HealthDataBroCallback() {
                @Override public void onResult(HealthDataSyncBean data) {
                    if (data == null) return;
                    JSONObject eventData = buildRealtimeDataPayload(data);
                    if (eventData != null) fireEvent("rwfit:healthData", eventData);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(realtimeDataCallback);
        }

        DHBleSdk.INSTANCE.subscribeData(new HealthDataControlCallback() {
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "controlHealthData failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
        });

        DHBleSdk.INSTANCE.controlHealthDataJL(key, (byte) state);
    }

    private void controlFindDevice(final Reply result) {
        DHBleSdk.INSTANCE.controlFindDeviceJL();
        result.success(success());
    }

    private void controlTakePhoto(MethodCall call, Reply result) {
        int state = i(call, "state");
        if (takePhotoEventCallback == null) {
            takePhotoEventCallback = new TakePhotoCallback() {
                @Override public void onSuccess() {}
                @Override public void onFail(int errorCode) {}
                @Override public void onResult(Integer data) {
                    // 设备上报 2 表示请求 App 拍照；0/1 分别是退出/进入拍照模式。
                    if (data == null || data != 2) return;
                    JSONObject eventData = new JSONObject();
                    eventData.put("keyType", 0);
                    eventData.put("touchType", 0);
                    eventData.put("action", "cameraTakePicture");
                    fireEvent("rwfit:touchEvent", eventData);
                }
            };
            DHBleSdk.INSTANCE.subscribeData(takePhotoEventCallback);
        }
        DHBleSdk.INSTANCE.subscribeData(new TakePhotoCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "controlTakePhoto failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.controlTakePhotoJL(state);
    }

    private void controlPhone(MethodCall call, final Reply result) {
        registerPersistentCallbacks();
        DHBleSdk.INSTANCE.subscribeData(new CallRemindCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "controlPhone failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.controlPhoneJL(i(call, "action"));
    }

    private void getMuslimCountEnabled(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new MuslimCountSwitchCallback() {
            @Override public void onResult(Integer data) {
                Map<String, Object> response = success();
                response.put("enabled", data != null && data == 1);
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getMuslimCountEnabled failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.deviceRememberSwitchGet();
    }

    private void setMuslimCountEnabled(MethodCall call, final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new MuslimCountSwitchCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setMuslimCountEnabled failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.deviceRememberSwitch(b(call, "enabled") ? 1 : 0);
    }

    private void getHeartRateAlert(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new HrReminderCallback() {
            @Override public void onResult(HrReminderBean data) {
                if (data == null) return;
                Map<String, Object> response = success();
                response.put("isOpen", data.isOpen());
                response.put("highThreshold", data.getRemindValue());
                if (data.getUnderValue() != 0xff) {
                    response.put("lowThreshold", data.getUnderValue());
                }
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getHeartRateAlert failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.deviceGetHrAlertCmd();
    }

    private void setHeartRateAlert(MethodCall call, final Reply result) {
        Object rawLowThreshold = call.argument("lowThreshold");
        DHBleSdk.INSTANCE.subscribeData(new HrReminderCallback() {
            @Override public void onResult(HrReminderBean data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setHeartRateAlert failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.deviceSetHrAlertCmd(
                b(call, "isOpen") ? 1 : 0,
                i(call, "highThreshold"),
                rawLowThreshold != null ? asInt(rawLowThreshold) : 0xff);
    }

    private void getBloodOxygenAlert(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BoReminderCallback() {
            @Override public void onResult(BoReminderBean data) {
                if (data == null) return;
                Map<String, Object> response = success();
                response.put("isOpen", data.isOpen());
                response.put("lowThreshold", data.getRemindValue());
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getBloodOxygenAlert failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.deviceGetBoAlertCmd();
    }

    private void setBloodOxygenAlert(MethodCall call, final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BoReminderCallback() {
            @Override public void onResult(BoReminderBean data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setBloodOxygenAlert failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.deviceSetBoAlertCmd(
                b(call, "isOpen") ? 1 : 0,
                i(call, "lowThreshold"));
    }

    private void ringOta(MethodCall call, final Reply result) {
        String otaPath = call.argument("path");
        DHBleSdk.INSTANCE.ringOtaWithFileData(otaPath, new OnFileTransferCallback() {
            @Override public void onProgress(float pro) {
                // 归一化到 0–1。当前 Android SDK 回调尺度为 0–1；大于 1
                // 的分支仅作防御性兼容，当前 SDK 版本未验证会返回 0–100。
                float normalized = pro > 1.0f ? pro / 100.0f : pro;
                fireEvent("rwfit:otaProgress", "progress", normalized);
            }
            @Override public void onFinish() {
                fireEvent("rwfit:otaFinish", null, 0);
            }
            @Override public void onFail(int code) {
                fireEvent("rwfit:otaFinish", "code", code);
            }
        });
        // Future 只表示升级任务已成功提交；终态统一通过 onOtaFinish。
        result.success(success());
    }

    private void unbind(final Reply result) {
        DHBleSdk.INSTANCE.subscribeStatus(new CommonStatusCallback() {
            @Override public void onSuccess(int msgId) {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int msgId, int errorCode) {
                result.error(errorCode, "unbind failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.unbindJL();
    }

    // ==================== 设备信息 ====================

    private void setUserInfo(MethodCall call, final Reply result) {
        PersonBean person = new PersonBean();
        person.setGender(i(call, "gender"));
        // Android SDK 接收 cm/kg 浮点值，与 Dart 层传入一致。
        person.setHeight(f(call, "height"));
        person.setWeight(f(call, "weight"));
        person.setAge(i(call, "age"));
        person.setMeasureUnit(0); // 固定公制
        statusReply(result, "setUserInfo failed");
        DHBleSdk.INSTANCE.setUserInfo(person);
    }

    private void setTimeFormat(MethodCall call, final Reply result) {
        statusReply(result, "setTimeFormat failed");
        DHBleSdk.INSTANCE.ringSetTimeformat(i(call, "format"));
    }

    private void setRingBtName(MethodCall call, final Reply result) {
        BtNameBean bean = new BtNameBean();
        bean.setBtName(s(call, "name"));
        DHBleSdk.INSTANCE.setRingBtName(bean);
        statusReply(result, "setRingBtName failed");
    }

    private void getFunctionList(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new SupportCallback() {
            @Override public void onSuccess() {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getFunctionList failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onResult(SupportMenuBean bean) {
                Map<String, Object> r = success();
                r.put("supportMenu", supportMenuMap(bean));
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.getFunctionListV2JL();
    }

    static Map<String, Object> supportMenuMap(SupportMenuBean bean) {
        Map<String, Object> menu = new HashMap<>();
        menu.put("isPushMsgEnableSwitch", bean.isPushMsgEnableSwitch());
        menu.put("pushMsgSwitchValue", bean.getPushMsgSwitchValue());
        menu.put("pushMsgSwitchValue2", bean.getPushMsgSwitchValue2());
        int activityDataInterval = bean.getActivityDataInterval();
        menu.put("activityDataInterval", activityDataInterval > 0 ? activityDataInterval : 60);
        menu.put("isAlarm", bean.isAlarm());
        menu.put("isBrightScreenSleepTime", bean.isBrightScreenSleepTime());
        menu.put("isBrightScreenTime", bean.isBrightScreenTime());
        menu.put("isSupportWorkout", bean.isNewSport());
        menu.put("isRememberSwitch", bean.isRememberSwitch());
        menu.put("isSupportHrReminder", bean.isSupportHrReminder());
        menu.put("isSupportBoReminder", bean.isSupportBoReminder());
        menu.put("isSupportMotoVibrationLevel", bean.isSupportMotoVibrationLevel());
        menu.put("isSupportAlarmVibrationDuration", bean.isSupportAlarmVibrationDuration());
        menu.put("isSupportVibrationInterval", bean.isSupportVibrationInterval());
        menu.put("isStep", bean.isStep());
        menu.put("isSleep", bean.isSleep());
        menu.put("isHr", bean.isHr());
        menu.put("isBloodOxy", bean.isBloodOxy());
        menu.put("isBloodPress", bean.isBloodPress());
        menu.put("isBloodSugar", bean.isBloodSugar());
        menu.put("isHrv", bean.isHrv());
        menu.put("isPressure", bean.isPressure());
        menu.put("isMuslimCountData", bean.isMuslimCountData());
        menu.put("isBodyTemp", bean.isDataTypeTemperature());
        menu.put("isSupportMuslimTimeDisplayMode", bean.isSupportMuslimTimeDisplayMode());
        menu.put("isSupportSensorRawPPG", bean.isSupportSensorRawPPG());
        menu.put("isSupportPPGMonitoring", bean.isSupportPPGMonitoring());
        menu.put("isSupportTemperatureMonitoring", bean.isSupportTemperatureMonitoring());
        menu.put("isSupportCountReminder", bean.isSupportCountReminder());
        menu.put("isSupportSensorRawACC", bean.isSupportSensorRawACC());
        menu.put("isSupportSensorRawPPGRed", bean.isSupportSensorRawPPGRed());
        menu.put("isSupportSensorRawIR", bean.isSupportSensorRawIR());
        menu.put("isSupportSensorRawSleep", bean.isSupportSensorRawSleep());
        menu.put("isSupportFallDetect", bean.isSupportFallDetect());
        menu.put("isSupportRecording", bean.isSupportRecording());
        menu.put("isFindDevice", bean.isFindDevice());
        menu.put("isTakePhoto", bean.isTakePhoto());
        menu.put("isLedLight", bean.isLEDLight());
        menu.put("isWearDirection", bean.isWearDir());
        menu.put("isVideoHid", bean.isVideoHid());
        menu.put("isVideoHidBook", bean.isVideoHidBook());
        menu.put("isVideoHidMusic", bean.isVideoHidMusic());
        menu.put("isRaiseBrightScreen", bean.isRaiseBrightScreen());
        menu.put("isPowerOff", bean.isPowerOff());
        menu.put("isFactoryReset", bean.isRecovery());
        menu.put("isPushMessage", bean.isMsgNotification());
        return menu;
    }

    // ==================== 全天检测（8 项共用 DrinkReminderBean）====================

    private DrinkReminderBean timedBean(MethodCall call) {
        DrinkReminderBean bean = new DrinkReminderBean();
        bean.setOpen(b(call, "isOpen"));
        bean.setRemindDuration(i(call, "duration"));
        // 全天检测协议固定为 00:00–23:59，不透传调用方自定义时段。
        bean.setStartHour(0);
        bean.setStartMin(0);
        bean.setEndHour(23);
        bean.setEndMin(59);
        return bean;
    }

    private void timedReply(Reply result, DrinkReminderBean d) {
        if (d == null) return;
        Map<String, Object> r = success();
        r.put("isOpen", d.isOpen());
        r.put("duration", d.getRemindDuration());
        r.put("startHour", 0);
        r.put("startMin", 0);
        r.put("endHour", 23);
        r.put("endMin", 59);
        result.success(r);
    }

    private void getTimed(final Reply result, String type) {
        switch (type) {
            case "hr":
                DHBleSdk.INSTANCE.subscribeData(new TimedHeartRateCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedHeartRateJL();
                break;
            case "bo":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodOxygenCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedBloodOxygenJL();
                break;
            case "hrv":
                DHBleSdk.INSTANCE.subscribeData(new TimedHrvCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedHRVJL();
                break;
            case "stress":
                DHBleSdk.INSTANCE.subscribeData(new TimedStressCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedStressJL();
                break;
            case "sugar":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodSugarCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedBloodSugarJL();
                break;
            case "bp":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodPressureCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedBloodPressureJL();
                break;
            case "temp":
                DHBleSdk.INSTANCE.subscribeData(new TimedBodyTemperatureCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedBodyTemperature();
                break;
            case "ppg":
                DHBleSdk.INSTANCE.subscribeData(new TimedPPGCallback() {
                    @Override public void onResult(DrinkReminderBean d) { timedReply(result, d); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onFail(int e) { result.error(e, "getTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() {}
                });
                DHBleSdk.INSTANCE.getTimedPPGJL();
                break;
        }
    }

    private void setTimed(MethodCall call, final Reply result, String type) {
        DrinkReminderBean bean = timedBean(call);
        switch (type) {
            case "hr":
                DHBleSdk.INSTANCE.subscribeData(new TimedHeartRateCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedHeartRateJL(bean);
                break;
            case "bo":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodOxygenCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedBloodOxygenJL(bean);
                break;
            case "hrv":
                DHBleSdk.INSTANCE.subscribeData(new TimedHrvCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedHRVJL(bean);
                break;
            case "stress":
                DHBleSdk.INSTANCE.subscribeData(new TimedStressCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedStressJL(bean);
                break;
            case "sugar":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodSugarCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedBloodSugarJL(bean);
                break;
            case "bp":
                DHBleSdk.INSTANCE.subscribeData(new TimedBloodPressureCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedBloodPressureJL(bean);
                break;
            case "temp":
                DHBleSdk.INSTANCE.subscribeData(new TimedBodyTemperatureCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedBodyTemperature(bean);
                break;
            case "ppg":
                DHBleSdk.INSTANCE.subscribeData(new TimedPPGCallback() {
                    @Override public void onResult(DrinkReminderBean d) {}
                    @Override public void onFail(int e) { result.error(e, "setTimed failed"); DHBleSdk.INSTANCE.dispose(this); }
                    @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
                });
                DHBleSdk.INSTANCE.setTimedPPGJL(bean);
                break;
        }
    }

    // ==================== 闹钟 ====================

    private void getAlarm(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new AlarmCallback() {
            @Override public void onResult(List<AlarmRemainderBean> data) {
                JSONArray arr = new JSONArray();
                if (data != null) {
                    for (AlarmRemainderBean bean : data) {
                        if (bean == null) continue;
                        JSONObject item = new JSONObject();
                        item.put("alarmId", bean.getAlarmId());
                        item.put("startHour", bean.getStartHour());
                        item.put("startMin", bean.getStartMin());
                        item.put("isOpen", bean.isOpen());
                        int[] repeatModel = bean.getRepeatModel();
                        JSONArray repeats = new JSONArray();
                        if (repeatModel != null) for (int v : repeatModel) repeats.add(v);
                        item.put("repeats", repeats);
                        arr.add(item);
                    }
                }
                Map<String, Object> r = success();
                r.put("data", toCodecSafe(arr));
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) { result.error(errorCode, "getAlarm failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getAlarmRemindJL();
    }

    private void setAlarm(MethodCall call, final Reply result) {
        List<Map<String, Object>> alarms = call.argument("alarms");
        ArrayList<AlarmRemainderBean> params = new ArrayList<>();
        if (alarms != null) {
            for (Map<String, Object> item : alarms) {
                AlarmRemainderBean bean = new AlarmRemainderBean();
                bean.setAlarmId(asInt(item.get("alarmId")));
                bean.setStartHour(asInt(item.get("startHour")));
                bean.setStartMin(asInt(item.get("startMin")));
                bean.setOpen(Boolean.TRUE.equals(item.get("isOpen")));
                // 当前协议包不包含 alarmTag，对外不暴露无效字段。
                bean.setAlarmTag("");
                int[] repeatModel = new int[7];
                Object rep = item.get("repeats");
                if (rep instanceof List) {
                    List<?> rl = (List<?>) rep;
                    for (int r = 0; r < Math.min(7, rl.size()); r++) repeatModel[r] = asInt(rl.get(r));
                }
                bean.setRepeatModel(repeatModel);
                params.add(bean);
            }
        }
        DHBleSdk.INSTANCE.subscribeData(new AlarmCallback() {
            @Override public void onResult(List<AlarmRemainderBean> data) {}
            @Override public void onFail(int errorCode) { result.error(errorCode, "setAlarm failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setAlarmRemindJL(params);
    }

    private void deleteAllAlarm(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new AlarmCallback() {
            @Override public void onResult(List<AlarmRemainderBean> data) {}
            @Override public void onFail(int errorCode) { result.error(errorCode, "deleteAllAlarm failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.deleteAllAlarmRemindJL();
    }

    // ==================== 屏幕 ====================

    private void getRaiseBrightScreen(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BrightCallback() {
            @Override public void onResult(BrightScreenBean d) {
                if (d == null) return;
                Map<String, Object> r = success();
                r.put("isOpen", d.isOpen());
                r.put("startHour", d.getStartHour());
                r.put("startMin", d.getStartMin());
                r.put("endHour", d.getEndHour());
                r.put("endMin", d.getEndMin());
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) { result.error(e, "getRaiseBrightScreen failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getRaiseBrightScreenJL();
    }

    private void setRaiseBrightScreen(MethodCall call, final Reply result) {
        BrightScreenBean bean = new BrightScreenBean();
        bean.setOpen(b(call, "isOpen"));
        bean.setStartHour(i(call, "startHour"));
        bean.setStartMin(i(call, "startMin"));
        bean.setEndHour(i(call, "endHour"));
        bean.setEndMin(i(call, "endMin"));
        DHBleSdk.INSTANCE.subscribeData(new BrightCallback() {
            @Override public void onResult(BrightScreenBean d) {}
            @Override public void onFail(int e) { result.error(e, "setRaiseBrightScreen failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setRaiseBrightScreenJL(bean);
    }

    private void getBrightScreenTime(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BrightTimeCallback() {
            @Override public void onResult(BrightScreenTimeBean d) {
                if (d == null) return;
                Map<String, Object> r = success();
                r.put("timeSecond", d.getTimeSecond());
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) {
                result.error(e, "getBrightScreenTime failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getBrightScreenTimeJL();
    }

    private void setBrightScreenTime(MethodCall call, final Reply result) {
        BrightScreenTimeBean bean = new BrightScreenTimeBean();
        bean.setTimeSecond(i(call, "timeSecond"));
        DHBleSdk.INSTANCE.subscribeData(new BrightTimeCallback() {
            @Override public void onResult(BrightScreenTimeBean d) {}
            @Override public void onFail(int e) { result.error(e, "setBrightScreenTime failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setBrightScreenTimeJL(bean);
    }

    private void getBrightScreenSleepTime(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BrightTimeCallback() {
            @Override public void onResult(BrightScreenTimeBean d) {
                if (d == null) return;
                Map<String, Object> r = success();
                r.put("isOpen", d.isOpen());
                r.put("startHour", d.getStartHour());
                r.put("startMin", d.getStartMin());
                r.put("endHour", d.getEndHour());
                r.put("endMin", d.getEndMin());
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) {
                result.error(e, "getBrightScreenSleepTime failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getRingBrightScreenSleepTime();
    }

    private void setBrightScreenSleepTime(MethodCall call, final Reply result) {
        BrightScreenTimeBean bean = new BrightScreenTimeBean();
        bean.setOpen(b(call, "isOpen"));
        bean.setStartHour(i(call, "startHour"));
        bean.setStartMin(i(call, "startMin"));
        bean.setEndHour(i(call, "endHour"));
        bean.setEndMin(i(call, "endMin"));
        DHBleSdk.INSTANCE.subscribeData(new BrightTimeCallback() {
            @Override public void onResult(BrightScreenTimeBean d) {}
            @Override public void onFail(int e) { result.error(e, "setBrightScreenSleepTime failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setRingBrightScreenSleepTime(bean);
    }

    private void getRingLedLevel(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new BrightLedLevelCallback() {
            @Override public void onResult(BrightScreenLedBean d) {
                if (d == null) return;
                Map<String, Object> r = success();
                r.put("isOpen", d.isOpen());
                r.put("lcdLevel", d.getLcdLevel());
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) {
                result.error(e, "getRingLedLevel failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getRingLedLevel();
    }

    private void setRingLedLevel(MethodCall call, final Reply result) {
        BrightScreenLedBean bean = new BrightScreenLedBean();
        bean.setOpen(b(call, "isOpen"));
        bean.setLcdLevel(i(call, "lcdLevel"));
        DHBleSdk.INSTANCE.subscribeData(new BrightLedLevelCallback() {
            @Override public void onResult(BrightScreenLedBean d) {}
            @Override public void onFail(int e) { result.error(e, "setRingLedLevel failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setRingLedLevel(bean);
    }

    // ==================== 视频 HID ====================

    private void getVideoHid(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new VideoHidCallback() {
            @Override public void onResult(VideoHidBean d) {
                if (d == null) return;
                Map<String, Object> r = success();
                r.put("hidOpen", d.getHidOpen());
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) {
                result.error(e, "getVideoHid failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getVideoHidJL();
    }

    private void setVideoHid(MethodCall call, final Reply result) {
        VideoHidBean bean = new VideoHidBean();
        bean.setHidOpen(i(call, "hidOpen"));
        DHBleSdk.INSTANCE.subscribeData(new VideoHidCallback() {
            @Override public void onResult(VideoHidBean d) {}
            @Override public void onFail(int e) { result.error(e, "setVideoHid failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setVideoHidJL(bean);
    }

    // ==================== 佩戴方向 ====================

    private void getRingWearDir(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new WearHandCallback() {
            @Override public void onSuccess() {}
            @Override public void onResult(FactoryInBean d) {
                if (d != null) {
                    Map<String, Object> r = success();
                    r.put("isRight", d.isOpen() == 1);
                    result.success(r);
                }
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) { result.error(e, "getRingWearDir failed"); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.getRingWearDir();
    }

    private void setRingWearHand(MethodCall call, final Reply result) {
        boolean isRight = b(call, "isRight");
        DHBleSdk.INSTANCE.subscribeData(new WearHandCallback() {
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onResult(FactoryInBean d) {}
            @Override public void onFail(int e) { result.error(e, "setRingWearHand failed"); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setRingWearHand(isRight);
    }

    // ==================== 振动 ====================

    private void getVibrationCount(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new VibrationCountCallback() {
            @Override public void onSuccess() {}
            @Override public void onResult(BrightVibrationBean d) {
                if (d != null) {
                    Map<String, Object> r = success();
                    r.put("count", d.getCount());
                    r.put("level", d.getLevel());
                    result.success(r);
                }
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) { result.error(e, "getVibrationCount failed"); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.getVibrationCount();
    }

    private void setVibrationCount(MethodCall call, final Reply result) {
        int level = i(call, "level");
        int count = i(call, "count");
        DHBleSdk.INSTANCE.subscribeData(new VibrationCountCallback() {
            @Override public void onResult(BrightVibrationBean d) {}
            @Override public void onFail(int e) { result.error(e, "setVibrationCount failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setVibrationCount(level, count);
    }

    private void getAlarmVibrationDuration(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new AlarmVibrationDurationCallback() {
            @Override public void onResult(Integer data) {
                Map<String, Object> r = success();
                r.put("duration", data);
                result.success(r);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int e) { result.error(e, "getAlarmVibrationDuration failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getAlarmVibrationDuration();
    }

    private void setAlarmVibrationDuration(MethodCall call, final Reply result) {
        int duration = i(call, "duration");
        DHBleSdk.INSTANCE.subscribeData(new AlarmVibrationDurationCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int e) { result.error(e, "setAlarmVibrationDuration failed"); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onSuccess() { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
        });
        DHBleSdk.INSTANCE.setAlarmVibrationDuration(duration);
    }

    private void getVibrationInterval(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new VibrationIntervalCallback() {
            @Override public void onResult(Integer data) {
                Map<String, Object> response = success();
                response.put("intervalMs", data != null ? data : 0);
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getVibrationInterval failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getVibrationInterval();
    }

    private void setVibrationInterval(MethodCall call, final Reply result) {
        int intervalMs = i(call, "intervalMs");
        DHBleSdk.INSTANCE.subscribeData(new VibrationIntervalCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setVibrationInterval failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.setVibrationInterval(intervalMs);
    }

    private void startHeartRateCalibration(final Reply result) {
        registerPersistentCallbacks();
        DHBleSdk.INSTANCE.subscribeData(new FactoryTestCallback() {
            @Override public void onResult(long[] data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "startHeartRateCalibration failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.startFactoryTest(0x15);
    }

    private void getFallDetect(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new FallDetectCallback() {
            @Override public void onResult(Integer data) {
                Map<String, Object> response = success();
                response.put("enabled", data != null && data == 1);
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getFallDetect failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getFallDetect();
    }

    private void setFallDetect(MethodCall call, final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new FallDetectCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setFallDetect failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.setFallDetect(b(call, "enabled"));
    }

    private void getCountReminderInterval(final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new CountReminderIntervalCallback() {
            @Override public void onResult(Integer data) {
                Map<String, Object> response = success();
                response.put("intervalMinutes", data != null ? data : 0);
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getCountReminderInterval failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {}
        });
        DHBleSdk.INSTANCE.getCountReminderInterval();
    }

    private void setCountReminderInterval(MethodCall call, final Reply result) {
        DHBleSdk.INSTANCE.subscribeData(new CountReminderIntervalCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "setCountReminderInterval failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.setCountReminderInterval(i(call, "intervalMinutes"));
    }

    private void controlSensorRaw(MethodCall call, final Reply result) {
        registerPersistentCallbacks();
        DHBleSdk.INSTANCE.subscribeData(new SensorRawControlCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "controlSensorRaw failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.ringControlSensorRaw(
                b(call, "enabled") ? 1 : 2,
                i(call, "sensorType"));
    }

    private void getSensorRawHistory(final Reply result) {
        final List<Object> packets = new ArrayList<>();
        DHBleSdk.INSTANCE.subscribeData(new SensorHistoryRawCallback() {
            @Override public void onResult(List<SensorHistoryRawBean> data) {
                if (data == null) return;
                for (SensorHistoryRawBean item : data) {
                    if (item != null) packets.add(toCodecSafe(sensorHistoryRawPayload(item)));
                }
            }
            @Override public void onFail(int errorCode) {
                result.error(errorCode, "getSensorRawHistory failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                Map<String, Object> response = success();
                response.put("data", packets);
                result.success(response);
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.ringGetHistorySensorRaw();
    }

    // ==================== 消息推送（Android 专用）====================

    private void pushMessage(MethodCall call, final Reply result) {
        MsgPushBean bean = new MsgPushBean();
        bean.setAppId(s(call, "appId"));
        bean.setTitle(s(call, "title"));
        bean.setContent(s(call, "content"));
        if (call.argument("msgType") != null) bean.setMsgType(i(call, "msgType"));
        if (call.argument("timeMill") != null) bean.setTimeMill(l(call, "timeMill"));
        DHBleSdk.INSTANCE.subscribeData(new MsgPushSettingCallback() {
            @Override public void onResult(Integer data) {}
            @Override public void onFail(int e) {
                result.error(e, "pushMessage failed");
                DHBleSdk.INSTANCE.dispose(this);
            }
            @Override public void onSuccess() {
                result.success(success());
                DHBleSdk.INSTANCE.dispose(this);
            }
        });
        DHBleSdk.INSTANCE.setPushMsgJL(bean);
    }

    /** 用 CommonStatusCallback 统一回执的 set 类。 */
    private void statusReply(final Reply result, final String failMsg) {
        DHBleSdk.INSTANCE.subscribeStatus(new CommonStatusCallback() {
            @Override public void onSuccess(int msgId) { result.success(success()); DHBleSdk.INSTANCE.dispose(this); }
            @Override public void onFail(int msgId, int errorCode) { result.error(errorCode, failMsg); DHBleSdk.INSTANCE.dispose(this); }
        });
    }

    // ==================== 音乐控制（Android 专用，连接就绪后自动启用）====================

    void enableMusicControl() {
        if (musicControlEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(musicControlEventCallback);
            musicControlEventCallback = null;
        }
        musicControlEventCallback = new MusicPushSettingCallback() {
            @Override public void onSuccess() {}
            @Override public void onFail(int errorCode) {}
            @Override public void onResult(Integer data) {
                if (data == null) return;
                String action;
                switch (data) {
                    case 1: action = "musicPlay"; break;
                    case 2: action = "musicPause"; break;
                    // Android SDK 文档的 prev/next 定义相反；按设备实际动作统一。
                    case 3: action = "musicNext"; break;
                    case 4: action = "musicPrev"; break;
                    case 5: action = "musicVolumeUp"; break;
                    case 6: action = "musicVolumeDown"; break;
                    default: return;
                }
                dispatchMusicControl(data);
                JSONObject eventData = new JSONObject();
                eventData.put("keyType", 0);
                eventData.put("touchType", 0);
                eventData.put("action", action);
                fireEvent("rwfit:touchEvent", eventData);
            }
        };
        DHBleSdk.INSTANCE.subscribeData(musicControlEventCallback);
    }

    private void dispatchMusicControl(int code) {
        Context ctx = activity != null ? activity.getApplicationContext() : null;
        if (ctx == null) return;
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        switch (code) {
            case 1: sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY); break;
            case 2: sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PAUSE); break;
            // 设备端 prev/next 与系统媒体键语义相反，此处交换：3=next, 4=prev
            case 3: sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_NEXT); break;
            case 4: sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PREVIOUS); break;
            case 5: am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI); break;
            case 6: am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI); break;
            default: break;
        }
    }

    private void sendMediaKey(AudioManager am, int keyCode) {
        am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
        am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
    }

    private JSONObject buildRealtimeDataPayload(HealthDataSyncBean data) {
        int dataType = data.getDataType();
        JSONObject event = new JSONObject();
        event.put("dataType", dataType);
        switch (dataType) {
            case 1:
            case 13: {
                List<HrPartData> list = data.getHrPartData();
                if (list == null || list.isEmpty()) return null;
                HrPartData last = list.get(list.size() - 1);
                event.put("dataValue", last.getHr());
                event.put("time", last.getTime());
                return event;
            }
            case 3: {
                List<BoPartData> list = data.getBoPartData();
                if (list == null || list.isEmpty()) return null;
                BoPartData last = list.get(list.size() - 1);
                event.put("dataValue", last.getBo());
                event.put("time", last.getTime());
                return event;
            }
            case 4: {
                List<BpPartData> list = data.getBpPartData();
                if (list == null || list.isEmpty()) return null;
                BpPartData last = list.get(list.size() - 1);
                event.put("dataValue", last.getSp());
                event.put("diastolic", last.getDp());
                event.put("time", last.getTime());
                return event;
            }
            case 8: {
                List<PressurePartData> list = data.getPressurePartData();
                if (list == null || list.isEmpty()) return null;
                PressurePartData last = list.get(list.size() - 1);
                event.put("dataValue", last.getPressure());
                event.put("time", last.getTime());
                return event;
            }
            case 9: {
                // Android SDK 将实时血糖协议原始值（实际值 ×10）暂存在
                // TempPartData；桥接层除以 10，与历史数据及 iOS 统一为实际值。
                List<TempPartData> list = data.getTempPartData();
                if (list == null || list.isEmpty()) return null;
                TempPartData last = list.get(list.size() - 1);
                event.put("dataValue", last.getTemp() / 10.0);
                event.put("time", last.getTime());
                return event;
            }
            default:
                return null;
        }
    }

    private void registerPersistentCallbacks() {
        if (realtimeMeasureStateCallback == null) {
            realtimeMeasureStateCallback = new HealthDataControlCallback() {
                @Override public void onResult(Integer data) {
                    if (data != null && data >= 10) {
                        fireEvent("rwfit:realtimeMeasureComplete", new JSONObject());
                    }
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(realtimeMeasureStateCallback);
        }

        if (callControlEventCallback == null) {
            callControlEventCallback = new CallRemindCallback() {
                @Override public void onResult(Integer data) {
                    if (data == null) return;
                    String action;
                    if (data == 1) {
                        action = "answer";
                    } else if (data == 2) {
                        action = "reject";
                    } else {
                        action = "unknown";
                    }
                    JSONObject event = new JSONObject();
                    event.put("action", action);
                    event.put("rawValue", data);
                    fireEvent("rwfit:callControl", event);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(callControlEventCallback);
        }

        if (healthAlertEventCallback == null) {
            healthAlertEventCallback = new HrBoActualReminderCallback() {
                @Override public void onResult(HrBoActualReminderBean data) {
                    if (data == null) return;
                    JSONObject event = new JSONObject();
                    event.put("type", data.getType());
                    event.put("value", data.getRemindValue());
                    fireEvent("rwfit:healthAlert", event);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(healthAlertEventCallback);
        }

        if (touchEventCallback == null) {
            touchEventCallback = new TouchEventCallback() {
                @Override public void onResult(int[] data) {
                    if (data == null || data.length < 2) return;
                    JSONObject event = new JSONObject();
                    event.put("keyType", data[0]);
                    event.put("touchType", data[1]);
                    event.put("action", touchAction(data[0], data[1]));
                    fireEvent("rwfit:touchEvent", event);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(touchEventCallback);
        }

        if (factoryTestCallback == null) {
            factoryTestCallback = new FactoryTestCallback() {
                @Override public void onResult(long[] data) {
                    if (data == null || data.length < 2) return;
                    JSONObject event = new JSONObject();
                    event.put("testMode", data[0]);
                    event.put("result", data[1]);
                    fireEvent("rwfit:heartRateCalibration", event);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(factoryTestCallback);
        }

        if (sensorRawDataCallback == null) {
            sensorRawDataCallback = new SensorRawDataCallback() {
                @Override public void onResult(SensorRawDataBean data) {
                    if (data != null) {
                        fireEvent("rwfit:sensorRawData", sensorRawPayload(data));
                    }
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(sensorRawDataCallback);
        }

        if (sensorRawControlCallback == null) {
            sensorRawControlCallback = new SensorRawControlCallback() {
                @Override public void onResult(Integer data) {
                    JSONObject event = new JSONObject();
                    event.put("reason", data != null ? data : 0);
                    fireEvent("rwfit:sensorRawStopped", event);
                }
                @Override public void onFail(int errorCode) {}
                @Override public void onSuccess() {}
            };
            DHBleSdk.INSTANCE.subscribeData(sensorRawControlCallback);
        }
    }

    private void disposePersistentCallbacks() {
        if (realtimeDataCallback != null) {
            DHBleSdk.INSTANCE.dispose(realtimeDataCallback);
            realtimeDataCallback = null;
        }
        if (realtimeMeasureStateCallback != null) {
            DHBleSdk.INSTANCE.dispose(realtimeMeasureStateCallback);
            realtimeMeasureStateCallback = null;
        }
        if (workoutRealtimeCallback != null) {
            DHBleSdk.INSTANCE.dispose(workoutRealtimeCallback);
            workoutRealtimeCallback = null;
        }
        if (takePhotoEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(takePhotoEventCallback);
            takePhotoEventCallback = null;
        }
        if (musicControlEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(musicControlEventCallback);
            musicControlEventCallback = null;
        }
        if (callControlEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(callControlEventCallback);
            callControlEventCallback = null;
        }
        if (healthAlertEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(healthAlertEventCallback);
            healthAlertEventCallback = null;
        }
        if (touchEventCallback != null) {
            DHBleSdk.INSTANCE.dispose(touchEventCallback);
            touchEventCallback = null;
        }
        if (factoryTestCallback != null) {
            DHBleSdk.INSTANCE.dispose(factoryTestCallback);
            factoryTestCallback = null;
        }
        if (sensorRawDataCallback != null) {
            DHBleSdk.INSTANCE.dispose(sensorRawDataCallback);
            sensorRawDataCallback = null;
        }
        if (sensorRawControlCallback != null) {
            DHBleSdk.INSTANCE.dispose(sensorRawControlCallback);
            sensorRawControlCallback = null;
        }
    }

    private String touchAction(int keyType, int touchType) {
        if (keyType == 2) return "fallDetected";
        if (keyType != 1) return "unknown";
        switch (touchType) {
            case 1: return "singleTap";
            case 2: return "doubleTap";
            case 3: return "tripleTap";
            case 4: return "longPress";
            case 5: return "swing";
            default: return "unknown";
        }
    }

    private JSONObject sensorRawPayload(SensorRawDataBean data) {
        JSONObject payload = new JSONObject();
        payload.put("type", data.getType());
        if (data.getTimestamp() > 0) {
            payload.put("timestampSec", data.getTimestamp());
        }
        putSensorRawLists(
                payload,
                data.getPpgDataList(),
                data.getAccDataList(),
                data.getPpgRedDataList(),
                data.getIrDataList());

        JSONArray sleep = new JSONArray();
        List<long[]> sleepData = data.getSleepDataList();
        if (sleepData != null) {
            for (long[] item : sleepData) {
                if (item == null || item.length < 2) continue;
                JSONObject sample = new JSONObject();
                sample.put("timestampSec", item[0]);
                sample.put("mode", item[1]);
                sleep.add(sample);
            }
        }
        payload.put("sleep", sleep);
        return payload;
    }

    private JSONObject sensorHistoryRawPayload(SensorHistoryRawBean data) {
        JSONObject payload = new JSONObject();
        payload.put("type", data.getType());
        payload.put("sequence", data.getSequence());
        putSensorRawLists(
                payload,
                data.getPpgDataList(),
                data.getAccDataList(),
                data.getPpgRedDataList(),
                data.getIrDataList());
        payload.put("sleep", new JSONArray());
        return payload;
    }

    private void putSensorRawLists(
            JSONObject payload,
            List<Integer> ppg,
            List<SensorRawDataBean.AccRawItem> acc,
            List<Integer> ppgRed,
            List<Integer> ir) {
        payload.put("ppg", ppg != null ? ppg : new ArrayList<>());
        payload.put("ppgRed", ppgRed != null ? ppgRed : new ArrayList<>());
        payload.put("ir", ir != null ? ir : new ArrayList<>());

        JSONArray accPayload = new JSONArray();
        if (acc != null) {
            for (SensorRawDataBean.AccRawItem item : acc) {
                if (item == null) continue;
                JSONObject sample = new JSONObject();
                sample.put("x", item.getX());
                sample.put("y", item.getY());
                sample.put("z", item.getZ());
                accPayload.add(sample);
            }
        }
        payload.put("acc", accPayload);
    }

    // ==================== 事件转发 ====================

    void fireEvent(String eventName, JSONObject rawData) {
        JSONObject data = rawData != null ? rawData : new JSONObject();
        data.put("event", eventName);
        final Object safe = toCodecSafe(data);
        main.post(() -> {
            if (!(safe instanceof Map)) return;
            @SuppressWarnings("unchecked")
            WritableMap payload = Arguments.makeNativeMap((Map<String, Object>) safe);
            switch (eventName) {
                case "rwfit:scanResult": emitOnScanResult(payload); break;
                case "rwfit:scanFinish": emitOnScanFinish(payload); break;
                case "rwfit:connectState": emitOnConnectState(payload); break;
                case "rwfit:functionMenu": emitOnFunctionMenu(payload); break;
                case "rwfit:healthData": emitOnHealthData(payload); break;
                case "rwfit:realtimeMeasureComplete": emitOnRealtimeMeasureComplete(payload); break;
                case "rwfit:workoutRealtimeData": emitOnWorkoutRealtimeData(payload); break;
                case "rwfit:syncProgress": emitOnSyncProgress(payload); break;
                case "rwfit:syncResult": emitOnSyncResult(payload); break;
                case "rwfit:syncFinish": emitOnSyncFinish(payload); break;
                case "rwfit:syncError": emitOnSyncError(payload); break;
                case "rwfit:otaProgress": emitOnOtaProgress(payload); break;
                case "rwfit:otaFinish": emitOnOtaFinish(payload); break;
                case "rwfit:touchEvent": emitOnTouchEvent(payload); break;
                case "rwfit:callControl": emitOnCallControl(payload); break;
                case "rwfit:healthAlert": emitOnHealthAlert(payload); break;
                case "rwfit:heartRateCalibration": emitOnHeartRateCalibration(payload); break;
                case "rwfit:sensorRawData": emitOnSensorRawData(payload); break;
                case "rwfit:sensorRawStopped": emitOnSensorRawStopped(payload); break;
                default: Log.w(TAG, "unknown event: " + eventName);
            }
        });
    }

    /** OTA 旧代码 key/value 形式：key==null → 空对象（成功 {}）。 */
    void fireEvent(String eventName, String key, Object value) {
        JSONObject o = new JSONObject();
        if (key != null) o.put(key, value);
        fireEvent(eventName, o);
    }

    // ==================== 工具 ====================

    private Map<String, Object> success() {
        Map<String, Object> m = new HashMap<>();
        m.put("code", 0);
        m.put("msg", "success");
        return m;
    }

    // 入参安全提取（MethodCall.argument 缺省返回 null）
    private int i(MethodCall c, String k) { return asInt(c.argument(k)); }
    private long l(MethodCall c, String k) { Object v = c.argument(k); return v instanceof Number ? ((Number) v).longValue() : 0L; }
    private float f(MethodCall c, String k) { Object v = c.argument(k); return v instanceof Number ? ((Number) v).floatValue() : 0f; }
    private boolean b(MethodCall c, String k) { Boolean v = c.argument(k); return v != null && v; }
    private String s(MethodCall c, String k) { Object v = c.argument(k); return v instanceof String ? (String) v : ""; }
    private static int asInt(Object v) {
        if (v instanceof Number) return ((Number) v).intValue();
        if (v instanceof String) {
            try { return Integer.parseInt((String) v); } catch (NumberFormatException ignored) {}
        }
        return 0;
    }

    /** JSONObject/JSONArray/Map/List → React Native 可序列化结构（递归）。 */
    static Object toCodecSafe(Object v) {
        if (v instanceof JSONObject) {
            Map<String, Object> m = new HashMap<>();
            for (String k : ((JSONObject) v).keySet()) {
                m.put(k, toCodecSafe(((JSONObject) v).get(k)));
            }
            return m;
        } else if (v instanceof JSONArray) {
            List<Object> l = new ArrayList<>();
            for (Object e : (JSONArray) v) l.add(toCodecSafe(e));
            return l;
        } else if (v instanceof Map) {
            Map<String, Object> m = new HashMap<>();
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) v).entrySet()) {
                if (entry.getKey() != null) {
                    m.put(String.valueOf(entry.getKey()), toCodecSafe(entry.getValue()));
                }
            }
            return m;
        } else if (v instanceof List) {
            List<Object> l = new ArrayList<>();
            for (Object e : (List<?>) v) l.add(toCodecSafe(e));
            return l;
        }
        return v;
    }

    /** Promise.resolve 在 New Architecture 下不接受普通 HashMap/ArrayList。 */
    private static Object toReactNativeValue(Object value) {
        Object safe = toCodecSafe(value);
        if (safe instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) safe;
            return Arguments.makeNativeMap(map);
        }
        if (safe instanceof List) {
            return Arguments.makeNativeArray((List<?>) safe);
        }
        return safe;
    }

    /** RN Promise 结果必须在主线程回、且只回一次。 */
    private static final class Reply {
        private final Promise result;
        private final Handler main;
        private boolean done;

        Reply(Promise result, Handler main) {
            this.result = result;
            this.main = main;
        }

        void success(final Object data) {
            if (done) return;
            done = true;
            final Object nativeData = toReactNativeValue(data);
            main.post(() -> result.resolve(nativeData));
        }

        /**
         * 失败也走 success 回一个 {code!=0, msg} Map —— 与 Dart callAsync 的
         * "读 result['code']、非 0 抛 RwfitException" 契约一致（不要用 result.error，
         * 否则 Dart 侧拿到的是 PlatformException 而非 RwfitException）。
         */
        void error(final int code, final String msg) {
            if (done) return;
            done = true;
            final Map<String, Object> m = new HashMap<>();
            m.put("code", code);
            m.put("msg", msg);
            final Object nativeData = toReactNativeValue(m);
            main.post(() -> result.resolve(nativeData));
        }

        void notImplemented() {
            error(-1, "native method is not implemented");
        }
    }

    /** Flutter MethodCall 的最小兼容外壳，保留已验证的参数读取逻辑。 */
    private static final class MethodCall {
        final String method;
        private final Map<String, Object> arguments;

        MethodCall(String method, Map<String, Object> arguments) {
            this.method = method;
            this.arguments = arguments != null ? arguments : new HashMap<>();
        }

        @SuppressWarnings("unchecked")
        <T> T argument(String key) {
            return (T) arguments.get(key);
        }
    }
}
