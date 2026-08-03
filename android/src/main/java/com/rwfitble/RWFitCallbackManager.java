package com.rwfitble;

import android.util.Log;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import com.example.blesdk.bean.function.*;
import com.example.blesdk.bean.sync.*;
import com.example.blesdk.ble.bean.BleDevice;
import com.example.blesdk.blering.RingBleError;
import com.example.blesdk.blering.RingConnectBleCallback;
import com.example.blesdk.callback.HealthDataSyncCallback;
import com.example.blesdk.callback.ScanDeviceCallback;

/**
 * RWFIT BLE SDK 回调管理器。统一把 SDK 回调转发给 TurboModule 事件发射器。
 */
public class RWFitCallbackManager implements ScanDeviceCallback,
        RingConnectBleCallback, HealthDataSyncCallback {

    private static final String TAG = "RWFitCallbackManager";
    private static RWFitCallbackManager instance;

    private RwfitBleModule plugin; // 用于 functionMenu 就绪后自动启用音乐控制

    private RWFitCallbackManager() {
    }

    public static synchronized RWFitCallbackManager getInstance() {
        if (instance == null) {
            instance = new RWFitCallbackManager();
        }
        return instance;
    }

    public void setPlugin(RwfitBleModule plugin) {
        this.plugin = plugin;
    }

    /** 统一事件转发，由模块负责切换到主线程并选择 Codegen emitter。 */
    void fireEvent(String eventName, JSONObject data) {
        RwfitBleModule target = plugin;
        if (target != null) target.fireEvent(eventName, data);
    }

    // ==================== ScanDeviceCallback ====================

    @Override
    public void onScanDevice(BleDevice device) {
        if (device == null) return;
        JSONObject data = new JSONObject();
        data.put("name", device.getBleName());
        data.put("mac", device.getBleMac());
        data.put("rssi", device.getBleRssi());
        fireEvent("rwfit:scanResult", data);
    }

    @Override
    public void onScanFinish() {
        fireEvent("rwfit:scanFinish", new JSONObject());
    }

    @Override
    public void onError(int errorCode, Exception e) {
        Log.e(TAG, "scan failed: code=" + errorCode);
    }

    // ==================== RingConnectBleCallback ====================

    @Override
    public void onRingConnecting(BleDevice device) {
        JSONObject data = new JSONObject();
        data.put("state", "connecting");
        if (device != null) {
            data.put("name", device.getBleName());
            data.put("mac", device.getBleMac());
        }
        fireEvent("rwfit:connectState", data);
    }

    @Override
    public void onRingConnected(BleDevice device) {
        JSONObject data = new JSONObject();
        data.put("state", "connected");
        if (device != null) {
            data.put("name", device.getBleName());
            data.put("mac", device.getBleMac());
        }
        fireEvent("rwfit:connectState", data);
    }

    @Override
    public void onRingConnectFailed(BleDevice device, RingBleError reason) {
        JSONObject data = new JSONObject();
        data.put("state", "failed");
        data.put("reason", reason != null ? reason.name() : "unknown");
        if (device != null) {
            data.put("name", device.getBleName());
            data.put("mac", device.getBleMac());
        }
        fireEvent("rwfit:connectState", data);
    }

    @Override
    public void onRingDidFunctionMenu(BleDevice device, SupportMenuBean supportMenuBean) {
        JSONObject data = new JSONObject();
        data.put("state", "ready");
        if (device != null) {
            data.put("name", device.getBleName());
            data.put("mac", device.getBleMac());
        }
        if (supportMenuBean != null) {
            data.put("supportMenu", RwfitBleModule.supportMenuMap(supportMenuBean));
        }
        // 连接就绪后自动启用音乐控制订阅 (Android 专用，幂等)
        if (plugin != null) {
            plugin.enableMusicControl();
        }
        fireEvent("rwfit:functionMenu", data);
    }

    // ==================== HealthDataSyncCallback ====================

    @Override
    public void onSyncProgress(int progress) {
        // Android 当前只在完成时回调 100。过滤潜在的中间值，保持 Flutter
        // 契约为跨平台一致的“同步完成标记”，而不是不可比较的原生进度。
        if (progress < 100) return;
        JSONObject data = new JSONObject();
        data.put("progress", 100);
        fireEvent("rwfit:syncProgress", data);
    }

    @Override
    public void onSyncFinish() {
        fireEvent("rwfit:syncFinish", new JSONObject());
    }

    @Override
    public void onSyncError(int errorCode) {
        JSONObject data = new JSONObject();
        data.put("code", errorCode);
        fireEvent("rwfit:syncError", data);
    }

    @Override
    public void onSyncStep(List<StepSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (StepSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                day.put("totalSteps", bean.getTotalSteps());
                day.put("totalCalorie", bean.getTotalCalorie());
                day.put("totalDistance", bean.getTotalDistance());
                day.put("activityDataInterval", bean.getActivityDataInterval());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (StepItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = new JSONObject();
                        item.put("time", it.getTimestamp());
                        item.put("index", it.getIndex());
                        item.put("steps", it.getSteps());
                        item.put("calorie", it.getCalorie());
                        item.put("distance", it.getDistance());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("step", arr));
    }

    @Override
    public void onSyncSleep(List<SleepSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (SleepSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                day.put("duration", bean.getTotalSleepTime());
                day.put("beginTime", bean.getAsleepTime());
                day.put("endTime", bean.getAwakeTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (SleepItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = new JSONObject();
                        item.put("len", it.getLen());
                        item.put("sleepType", it.getSleepType());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("sleep", arr));
    }

    @Override
    public void onSyncHr(List<HeartRateSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (HeartRateSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (HeartRateItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("hr", it.getHr());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("hr", arr));
    }

    @Override
    public void onSyncBp(List<BloodPressSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (BloodPressSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (BloodPressItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("systolic", it.getSp());
                        item.put("diastolic", it.getDp());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("bp", arr));
    }

    @Override
    public void onSyncBo(List<BloodOxySyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (BloodOxySyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (BloodOxyItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("bloodOxy", it.getBloodOxy());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("bo", arr));
    }

    @Override
    public void onSyncTemp(List<BodyTempSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (BodyTempSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (BodyTempItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        // raw 值为体温 ×10 (float)，App 端 ÷10 还原为 °C
                        item.put("temp", it.getTemp());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("temp", arr));
    }

    @Override
    public void onSyncPressure(List<PressureSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (PressureSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (PressureItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("pressure", it.getPressure());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("pressure", arr));
    }

    @Override
    public void onSyncBloodSugar(List<BloodSugarSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (BloodSugarSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (BloodSugarItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        // Android SDK 历史解析已除以 10，直接透传实际血糖值。
                        item.put("bloodSugar", it.getSugar());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("bloodSugar", arr));
    }

    @Override
    public void onSyncBreath(List<BreatheSyncBean> list) {
        // breath 数据不下发，双端统一不暴露
    }

    @Override
    public void onSyncHrv(List<HrvSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (HrvSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (HrvItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("hrv", it.getHrv());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("hrv", arr));
    }

    @Override
    public void onSyncMuslimCount(List<MuslimCountSyncBean> list) {
        JSONArray arr = new JSONArray();
        if (list != null) {
            for (MuslimCountSyncBean bean : list) {
                if (bean == null) continue;
                JSONObject day = buildDay(bean.getTime());
                day.put("totalCount", bean.getTotalCount());
                JSONArray items = new JSONArray();
                if (bean.getItems() != null) {
                    for (MuslimCountItemBean it : bean.getItems()) {
                        if (it == null) continue;
                        JSONObject item = buildItem(it.getTimeMills());
                        item.put("count", it.getCount());
                        items.add(item);
                    }
                }
                day.put("items", items);
                arr.add(day);
            }
        }
        fireEvent("rwfit:syncResult", syncResult("muslimCount", arr));
    }

    // ==================== 工具 ====================

    private JSONObject syncResult(String type, JSONArray data) {
        JSONObject ret = new JSONObject();
        ret.put("type", type);
        ret.put("data", data);
        return ret;
    }

    private JSONObject buildDay(long timeSec) {
        JSONObject day = new JSONObject();
        day.put("time", timeSec);
        day.put("date", formatDate(timeSec));
        return day;
    }

    private JSONObject buildItem(long timeSec) {
        JSONObject item = new JSONObject();
        item.put("time", timeSec);
        return item;
    }

    private String formatDate(long timeSec) {
        return new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date(timeSec * 1000L));
    }
}
