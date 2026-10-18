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
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
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

            // Stop existing advertiser if active
            if (isAdvertising && advertiseCallback != null) {
                try {
                    advertiser.stopAdvertising(advertiseCallback);
                } catch (Exception ignored) {}
                isAdvertising = false;
            }

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0) // Run continuously until stopped
                .build();

            // Encode payload to max 20 bytes for primary manufacturer data to stay strictly <= 31-byte legacy BLE PDU limit
            byte[] rawBytes = payload.getBytes(StandardCharsets.UTF_8);
            byte[] truncatedBytes;
            if (rawBytes.length > 20) {
                truncatedBytes = new byte[20];
                System.arraycopy(rawBytes, 0, truncatedBytes, 0, 20);
            } else {
                truncatedBytes = rawBytes;
            }

            // Primary Advertisement Data: Keep strictly minimal (Manufacturer ID + 20 byte payload = 24 bytes total)
            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addManufacturerData(MANUFACTURER_ID_RAKSHIKA, truncatedBytes)
                .build();

            // Scan Response Data: Contains the 128-bit Rakshika Service UUID to prevent primary PDU overflow
            AdvertiseData scanResponse = new AdvertiseData.Builder()
                .addServiceUuid(new ParcelUuid(RAKSHIKA_SERVICE_UUID))
                .build();

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
                }
            };

            advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);

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

            ScanSettings scanSettings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .build();

            List<ScanFilter> filters = new ArrayList<>();
            // Match Rakshika Service UUID or Manufacturer Data
            filters.add(new ScanFilter.Builder()
                .setServiceUuid(new ParcelUuid(RAKSHIKA_SERVICE_UUID))
                .build());
            filters.add(new ScanFilter.Builder()
                .setManufacturerData(MANUFACTURER_ID_RAKSHIKA, new byte[]{})
                .build());

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    super.onScanResult(callbackType, result);
                    if (result == null || result.getScanRecord() == null) return;

                    ScanRecord record = result.getScanRecord();
                    byte[] manuData = record.getManufacturerSpecificData(MANUFACTURER_ID_RAKSHIKA);
                    
                    String payloadStr = null;
                    if (manuData != null && manuData.length > 0) {
                        payloadStr = new String(manuData, StandardCharsets.UTF_8);
                    }

                    if (payloadStr != null && !payloadStr.isEmpty()) {
                        Log.i(TAG, "⚡ [BLE Native] Intercepted over-the-air emergency beacon! RSSI: " + result.getRssi() + "dBm, Payload: " + payloadStr);
                        
                        JSObject eventData = new JSObject();
                        eventData.put("ciphertext", payloadStr);
                        eventData.put("rssi", result.getRssi());
                        eventData.put("deviceAddress", result.getDevice() != null ? result.getDevice().getAddress() : "UNKNOWN");
                        eventData.put("timestamp", System.currentTimeMillis());

                        notifyListeners("onBeaconDetected", eventData);
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
            Log.i(TAG, "🔍 [BLE Native] Hardware BLE passive scanner active!");

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException se) {
            Log.e(TAG, "Scan permission missing: " + se.getMessage());
            call.reject("Bluetooth scan permission required: " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to start BLE scan: " + e.getMessage(), e);
            call.reject("BLE Scan error: " + e.getMessage());
        }
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
}
