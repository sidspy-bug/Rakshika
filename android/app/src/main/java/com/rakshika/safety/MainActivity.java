package com.rakshika.safety;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsPlugin.class);
        registerPlugin(BleMeshPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Proactively request Camera, Audio, SMS, Location, and BLE permissions
        java.util.ArrayList<String> permList = new java.util.ArrayList<>();
        permList.add(Manifest.permission.CAMERA);
        permList.add(Manifest.permission.RECORD_AUDIO);
        permList.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
        permList.add(Manifest.permission.SEND_SMS);
        permList.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permList.add(Manifest.permission.ACCESS_COARSE_LOCATION);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permList.add(Manifest.permission.BLUETOOTH_ADVERTISE);
            permList.add(Manifest.permission.BLUETOOTH_SCAN);
            permList.add(Manifest.permission.BLUETOOTH_CONNECT);
        }
        
        boolean needsRequest = false;
        for (String permission : permList) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }
        
        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permList.toArray(new String[0]), 100);
        }
    }
}
