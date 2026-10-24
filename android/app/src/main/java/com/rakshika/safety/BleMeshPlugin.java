package com.rakshika.safety;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ParcelUuid;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@CapacitorPlugin(
    name = "BleMeshPlugin",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BleMeshPlugin extends Plugin {
    private static final String TAG = "BleMeshPlugin";
    
    // Rakshika Dedicated Safety Mesh Service UUID (FD6F Style)
    private static final UUID RAKSHIKA_SERVICE_UUID = UUID.fromString("0000FD6F-0000-1000-8000-00805F9B34FB");
    private static final int MANUFACTURER_ID_RAKSHIKA = 0x0952; // Rakshika Custom BLE Manufacturer ID

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothLeScanner scanner;
    private AdvertiseCallback advertiseCallback;
    private ScanCallback scanCallback;
    private boolean isAdvertising = false;
    private boolean isScanning = false;
    private int currentScanMode = ScanSettings.SCAN_MODE_LOW_POWER;
    private long lastNotificationTime = 0;
    private String lastNotifiedPayload = "";

    @Override
    public void load() {
        super.load();
        try {
            BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (manager != null) {
                bluetoothAdapter = manager.getAdapter();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize BluetoothAdapter: " + e.getMessage());
        }
    }

    private boolean checkBluetoothState() {
        try {
            if (bluetoothAdapter == null) {
                BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
                if (manager != null) {
                    bluetoothAdapter = manager.getAdapter();
                }
            }
            return bluetoothAdapter != null && bluetoothAdapter.isEnabled();
        } catch (SecurityException se) {
            Log.w(TAG, "Bluetooth permission not yet granted: " + se.getMessage());
            return false;
        } catch (Exception e) {
            Log.w(TAG, "Error checking bluetooth state: " + e.getMessage());
            return false;
        }
    }

    /**
     * Check if Bluetooth is currently active and supported
     */
    @PluginMethod
    public void getBluetoothState(PluginCall call) {
        boolean isEnabled = checkBluetoothState();
        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        ret.put("supported", bluetoothAdapter != null);
        call.resolve(ret);
    }

    /**
     * Proactively request the user to turn on Bluetooth (critical in Airplane Mode)
     */
    @PluginMethod
    public void enableBluetooth(PluginCall call) {
        try {
            if (checkBluetoothState()) {
                JSObject ret = new JSObject();
                ret.put("enabled", true);
                ret.put("prompted", false);
                call.resolve(ret);
                return;
            }

            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            if (getActivity() != null) {
                getActivity().startActivity(enableBtIntent);
            } else {
                enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(enableBtIntent);
            }

            JSObject ret = new JSObject();
            ret.put("enabled", false);
            ret.put("prompted", true);
            call.resolve(ret);
        } catch (SecurityException se) {
            Log.w(TAG, "BLUETOOTH_CONNECT permission required to enable Bluetooth: " + se.getMessage());
            requestPermissionForAlias("bluetooth", call, "permissionCallbackForEnable");
        } catch (Exception e) {
            Log.e(TAG, "Failed to trigger Bluetooth enable intent: " + e.getMessage());
            call.reject("Could not prompt Bluetooth enable: " + e.getMessage());
        }
    }

    @PluginMethod
    public void permissionCallbackForEnable(PluginCall call) {
        enableBluetooth(call);
    }

    /**
     * Start Hardware BLE Advertising of Encrypted Distress Beacon
     */
    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String payload = call.getString("payload");
        String message = call.getString("message", "");
        if (payload == null || payload.isEmpty()) {
            call.reject("Must provide payload string");
            return;
        }

        if (!checkBluetoothState()) {
            Log.w(TAG, "Bluetooth is disabled or unavailable on this device (Airplane Mode).");
            // Automatically prompt the user to enable Bluetooth so distress beacon can transmit
            try {
                Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                if (getActivity() != null) {
                    getActivity().startActivity(enableBtIntent);
                } else {
                    enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(enableBtIntent);
                }
            } catch (Exception ex) {
                Log.w(TAG, "Could not prompt Bluetooth enable intent: " + ex.getMessage());
            }

            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "BLUETOOTH_DISABLED");
            ret.put("message", "Bluetooth is disabled. Please turn Bluetooth ON (even in Airplane Mode) to broadcast BLE distress beacon.");
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Requesting BLUETOOTH_ADVERTISE runtime permission...");
                requestPermissionForAlias("bluetooth", call, "advertisePermissionCallback");
                return;
            }
        }

        try {
            // Re-fetch advertiser in case Bluetooth was just enabled
            advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();

            if (advertiser == null) {
                Log.w(TAG, "BLE Hardware Advertising is not supported by this chipset.");
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "NOT_SUPPORTED");
                ret.put("message", "BLE Advertising not supported on this device chipset.");
                call.resolve(ret);
                return;
            }

            // Stop existing advertiser if active with a brief cooldown to prevent ADVERTISE_FAILED_ALREADY_STARTED
            if (isAdvertising && advertiser != null && advertiseCallback != null) {
                try {
                    advertiser.stopAdvertising(advertiseCallback);
                } catch (Exception ignored) {}
                isAdvertising = false;
                try {
                    Thread.sleep(120);
                } catch (InterruptedException ignored) {}
            }

            int durationMs = call.getInt("durationMs", 8000);
            if (durationMs <= 0 || durationMs > 180000) {
                durationMs = 8000;
            }

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(durationMs) // 8-second bounded distress broadcast window
                .build();

            // Decode hex ciphertext into raw 18 bytes binary payload
            byte[] rawBytes;
            if (payload.startsWith("rk_") && payload.length() >= 39) {
                try {
                    rawBytes = hexToBytes(payload.substring(3));
                } catch (Exception ex) {
                    rawBytes = payload.getBytes(StandardCharsets.UTF_8);
                }
            } else {
                rawBytes = payload.getBytes(StandardCharsets.UTF_8);
            }

            byte[] truncatedBytes;
            if (rawBytes.length > 20) {
                truncatedBytes = new byte[20];
                System.arraycopy(rawBytes, 0, truncatedBytes, 0, 20);
            } else {
                truncatedBytes = rawBytes;
            }

            // Primary Advertisement Data: Keep strictly minimal (Manufacturer ID + 20 byte payload = 24 bytes total <= 31 byte limit)
            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addManufacturerData(MANUFACTURER_ID_RAKSHIKA, truncatedBytes)
                .build();

            // Scan Response Data: strictly <= 31 bytes total (Do NOT combine 128-bit UUID and Service Data in same packet!)
            AdvertiseData scanResponse;
            if (message != null && !message.trim().isEmpty()) {
                byte[] msgBytes = message.trim().getBytes(StandardCharsets.UTF_8);
                // 128-bit UUID header + UUID takes 18 bytes. Max payload in 31-byte PDU = 11 bytes.
                int maxLen = 11;
                byte[] safeMsg = new byte[Math.min(msgBytes.length, maxLen)];
                System.arraycopy(msgBytes, 0, safeMsg, 0, safeMsg.length);
                scanResponse = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .setIncludeTxPowerLevel(false)
                    .addServiceData(new ParcelUuid(RAKSHIKA_SERVICE_UUID), safeMsg)
                    .build();
            } else {
                scanResponse = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .setIncludeTxPowerLevel(false)
                    .addServiceUuid(new ParcelUuid(RAKSHIKA_SERVICE_UUID))
                    .build();
            }

            final AdvertiseSettings finalSettings = settings;
            final AdvertiseData finalData = data;

            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    super.onStartSuccess(settingsInEffect);
                    isAdvertising = true;
                    Log.i(TAG, "📡 [BLE Native] Hardware BLE beacon broadcasting started successfully!");
                }

                @Override
                public void onStartFailure(int errorCode) {
                    super.onStartFailure(errorCode);
                    isAdvertising = false;
                    Log.e(TAG, "❌ [BLE Native] Hardware BLE broadcast failed with errorCode: " + errorCode);
                    if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE) {
                        Log.i(TAG, "🔄 [BLE Native] Retrying advertisement without ScanResponse packet (Pure Manufacturer Beacon)...");
                        try {
                            if (advertiser != null) {
                                advertiser.startAdvertising(finalSettings, finalData, new AdvertiseCallback() {
                                    @Override
                                    public void onStartSuccess(AdvertiseSettings fallbackSettings) {
                                        isAdvertising = true;
                                        Log.i(TAG, "📡 [BLE Native] Pure Manufacturer Beacon broadcasting active!");
                                    }

                                    @Override
                                    public void onStartFailure(int err) {
                                        isAdvertising = false;
                                        Log.e(TAG, "❌ [BLE Native] Fallback advertising failed with code: " + err);
                                    }
                                });
                            }
                        } catch (Exception ex) {
                            Log.e(TAG, "Fallback advertising exception: " + ex.getMessage());
                        }
                    }
                }
            };

            advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);

            // Automatically clean up native advertiser when duration window expires
            final int timeout = durationMs;
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (isAdvertising && advertiser != null && advertiseCallback != null) {
                            advertiser.stopAdvertising(advertiseCallback);
                            isAdvertising = false;
                            Log.i(TAG, "⏱️ [BLE Native] Bounded " + (timeout / 1000) + "s distress beacon broadcast finished.");
                        }
                    } catch (Exception ignored) {}
                }
            }, timeout);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("payload", payload);
            call.resolve(ret);
        } catch (SecurityException se) {
            Log.e(TAG, "BLE Permission missing: " + se.getMessage());
            call.reject("Bluetooth permission not granted: " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to start BLE advertising: " + e.getMessage(), e);
            call.reject("BLE Advert error: " + e.getMessage());
        }
    }

    @PermissionCallback
    public void advertisePermissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
        }

        if (granted) {
            Log.i(TAG, "BLUETOOTH_ADVERTISE permission granted, starting advertising...");
            startAdvertising(call);
        } else {
            Log.w(TAG, "BLUETOOTH_ADVERTISE permission denied by user.");
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "PERMISSION_DENIED");
            ret.put("message", "Bluetooth advertise permission required to broadcast distress beacons.");
            call.resolve(ret);
        }
    }

    /**
     * Stop Hardware BLE Advertising
     */
    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        try {
            if (advertiser != null && advertiseCallback != null && isAdvertising) {
                advertiser.stopAdvertising(advertiseCallback);
                isAdvertising = false;
                Log.i(TAG, "[BLE Native] Stopped hardware BLE advertising.");
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Error stopping advertising: " + e.getMessage());
            call.resolve(new JSObject().put("success", true));
        }
    }

    /**
     * Start Hardware BLE Passive Scanning for Nearby Victim Beacons
     */
    @PluginMethod
    public void startScanning(PluginCall call) {
        if (!checkBluetoothState()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "BLUETOOTH_DISABLED");
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                if (call.getBoolean("lowPower", false)) {
                    Log.i(TAG, "BLUETOOTH_SCAN permission not yet granted for passive background scan; will retry once granted.");
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "PERMISSION_NOT_GRANTED");
                    ret.put("message", "Bluetooth scan permission not yet granted.");
                    call.resolve(ret);
                    return;
                }
                Log.i(TAG, "Requesting BLUETOOTH_SCAN runtime permission...");
                requestPermissionForAlias("bluetooth", call, "scanPermissionCallback");
                return;
            }
        } else {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                if (call.getBoolean("lowPower", false)) {
                    Log.i(TAG, "ACCESS_FINE_LOCATION permission not yet granted for passive background scan; will retry once granted.");
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "PERMISSION_NOT_GRANTED");
                    ret.put("message", "Location permission not yet granted for BLE scan.");
                    call.resolve(ret);
                    return;
                }
                Log.i(TAG, "Requesting ACCESS_FINE_LOCATION permission for BLE scan...");
                requestPermissionForAlias("bluetooth", call, "scanPermissionCallback");
                return;
            }
        }

        try {
            if (scanner == null) {
                scanner = bluetoothAdapter.getBluetoothLeScanner();
            }

            if (scanner == null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "SCANNER_NOT_AVAILABLE");
                call.resolve(ret);
                return;
            }

            if (isScanning && scanCallback != null) {
                try {
                    scanner.stopScan(scanCallback);
                } catch (Exception ignored) {}
                isScanning = false;
            }

            int requestedMode = call.getBoolean("lowPower", true) ? ScanSettings.SCAN_MODE_LOW_POWER : ScanSettings.SCAN_MODE_BALANCED;
            currentScanMode = requestedMode;
            ScanSettings scanSettings = buildScanSettings(currentScanMode);
            List<ScanFilter> filters = buildScanFilters();

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    super.onScanResult(callbackType, result);
                    if (result == null || result.getScanRecord() == null) return;

                    ScanRecord record = result.getScanRecord();
                    byte[] manuData = record.getManufacturerSpecificData(MANUFACTURER_ID_RAKSHIKA);
                    byte[] serviceData = record.getServiceData(new ParcelUuid(RAKSHIKA_SERVICE_UUID));
                    
                    String payloadStr = null;
                    if (manuData != null && manuData.length > 0) {
                        payloadStr = "rk_" + bytesToHex(manuData);
                    }

                    String msgStr = null;
                    if (serviceData != null && serviceData.length > 0) {
                        try {
                            msgStr = new String(serviceData, StandardCharsets.UTF_8).trim();
                        } catch (Exception ignored) {}
                    }

                    if (payloadStr != null && !payloadStr.isEmpty()) {
                        Log.i(TAG, "⚡ [BLE Native] Intercepted over-the-air emergency beacon! RSSI: " + result.getRssi() + "dBm, Payload: " + payloadStr + (msgStr != null && !msgStr.isEmpty() ? (", Msg: " + msgStr) : ""));
                        
                        JSObject eventData = new JSObject();
                        eventData.put("ciphertext", payloadStr);
                        eventData.put("rssi", result.getRssi());
                        eventData.put("deviceAddress", result.getDevice() != null ? result.getDevice().getAddress() : "UNKNOWN");
                        eventData.put("timestamp", System.currentTimeMillis());
                        if (msgStr != null && !msgStr.isEmpty()) {
                            eventData.put("message", msgStr);
                        }

                        notifyListeners("onBeaconDetected", eventData);
                        postNativeSosNotification(msgStr, payloadStr, result.getRssi());
                    }
                }

                @Override
                public void onScanFailed(int errorCode) {
                    super.onScanFailed(errorCode);
                    Log.e(TAG, "❌ [BLE Native] BLE Scan failed with errorCode: " + errorCode);
                }
            };

            scanner.startScan(filters, scanSettings, scanCallback);
            isScanning = true;
            Log.i(TAG, "🔍 [BLE Native] Hardware BLE passive scanner active! (Mode: " + (currentScanMode == ScanSettings.SCAN_MODE_LOW_POWER ? "LOW_POWER/BATTERY_SAVER" : "BALANCED") + ")");

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("lowPower", currentScanMode == ScanSettings.SCAN_MODE_LOW_POWER);
            call.resolve(ret);
        } catch (SecurityException se) {
            Log.e(TAG, "Scan permission missing: " + se.getMessage());
            call.reject("Bluetooth scan permission required: " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to start BLE scan: " + e.getMessage(), e);
            call.reject("BLE Scan error: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        // App went to background or screen turned off: switch to ultra-low-power hardware-filtered scanning to prevent battery drainage
        switchScanMode(ScanSettings.SCAN_MODE_LOW_POWER);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        // App returned to foreground: use balanced mode for responsive detection
        switchScanMode(ScanSettings.SCAN_MODE_BALANCED);
    }

    private synchronized void switchScanMode(int newMode) {
        if (!isScanning || scanner == null || scanCallback == null) return;
        if (currentScanMode == newMode) return;
        currentScanMode = newMode;
        try {
            scanner.stopScan(scanCallback);
            ScanSettings newSettings = buildScanSettings(newMode);
            scanner.startScan(buildScanFilters(), newSettings, scanCallback);
            Log.d(TAG, "Switched BLE scan mode to: " + (newMode == ScanSettings.SCAN_MODE_LOW_POWER ? "LOW_POWER (Duty-cycle battery saver)" : "BALANCED"));
        } catch (Exception ex) {
            Log.w(TAG, "Failed to switch scan mode: " + ex.getMessage());
        }
    }

    private ScanSettings buildScanSettings(int mode) {
        ScanSettings.Builder builder = new ScanSettings.Builder()
            .setScanMode(mode)
            .setReportDelay(0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            builder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
            builder.setNumOfMatches(ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT);
            builder.setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
        }
        return builder.build();
    }

    private List<ScanFilter> buildScanFilters() {
        // Return null so Android delivers all BLE packets directly to onScanResult.
        // Software filtering in onScanResult then safely extracts MANUFACTURER_ID_RAKSHIKA
        // without OEM chipset hardware-filter dropping packets.
        return null;
    }

    @PermissionCallback
    public void scanPermissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
        } else {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        if (granted) {
            Log.i(TAG, "BLUETOOTH_SCAN permission granted, starting passive scanner...");
            startScanning(call);
        } else {
            Log.w(TAG, "BLUETOOTH_SCAN permission denied by user.");
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "PERMISSION_DENIED");
            ret.put("message", "Bluetooth scan permission required to receive peer SOS beacons.");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestBlePermissions(PluginCall call) {
        requestPermissionForAlias("bluetooth", call, "genericPermissionCallback");
    }

    @PermissionCallback
    public void genericPermissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
                      ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    /**
     * Stop Hardware BLE Passive Scanning
     */
    @PluginMethod
    public void stopScanning(PluginCall call) {
        try {
            if (scanner != null && scanCallback != null && isScanning) {
                scanner.stopScan(scanCallback);
                isScanning = false;
                Log.i(TAG, "[BLE Native] Stopped hardware BLE scanner.");
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Error stopping scanner: " + e.getMessage());
            call.resolve(new JSObject().put("success", true));
        }
    }

    private void postNativeSosNotification(String message, String payloadStr, int rssi) {
        try {
            long now = System.currentTimeMillis();
            if (now - lastNotificationTime < 10000 && payloadStr != null && payloadStr.equals(lastNotifiedPayload)) {
                // Debounce duplicate notification within 10s to prevent continuous buzzing
                return;
            }
            lastNotificationTime = now;
            lastNotifiedPayload = payloadStr != null ? payloadStr : "";

            Context ctx = getContext();
            if (ctx == null) return;

            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String channelId = "rakshika_offline_mesh_channel";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Rakshika Offline SOS Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("High-priority alerts when nearby offline BLE distress beacons are intercepted");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 600});
                nm.createNotificationChannel(channel);
            }

            Intent intent = new Intent(ctx, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            PendingIntent pendingIntent = PendingIntent.getActivity(
                ctx,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            String bodyText = (message != null && !message.isEmpty())
                ? "💬 \"" + message + "\" (Signal: " + rssi + " dBm)"
                : "Nearby offline distress beacon captured! Relaying to safety cloud.";

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, channelId)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle("🚨 OFFLINE PEER SOS INTERCEPTED!")
                .setContentText(bodyText)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(bodyText + "\nBeacon ID: " + (payloadStr.length() > 16 ? payloadStr.substring(0, 16) : payloadStr) + "..."))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 400, 200, 400, 200, 600})
                .setContentIntent(pendingIntent);

            // Direct hardware haptic vibration (works even if notification sound is muted)
            try {
                android.os.Vibrator v = (android.os.Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(android.os.VibrationEffect.createWaveform(new long[]{0, 500, 200, 500, 200, 800}, -1));
                    } else {
                        v.vibrate(new long[]{0, 500, 200, 500, 200, 800}, -1);
                    }
                }
            } catch (Exception ignored) {}

            nm.notify(91100, builder.build());
            Log.i(TAG, "🔔 [BLE Native] Posted system heads-up notification for intercepted SOS beacon!");
        } catch (Exception ex) {
            Log.w(TAG, "Could not post native SOS notification: " + ex.getMessage());
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i+1), 16));
        }
        return data;
    }
}
