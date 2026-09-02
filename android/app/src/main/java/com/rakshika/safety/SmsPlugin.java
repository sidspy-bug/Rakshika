package com.rakshika.safety;

import android.Manifest;
import android.os.Build;
import android.telephony.SmsManager;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "SmsPlugin",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.SEND_SMS }
        )
    }
)
public class SmsPlugin extends Plugin {
    private static final String TAG = "SmsPlugin";

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phone = call.getString("phone");
        String message = call.getString("message");
        if (phone == null || message == null) {
            call.reject("Must provide phone and message");
            return;
        }

        // Sanitize phone number (remove spaces, dashes, parentheses)
        phone = phone.replaceAll("[\\s\\-\\(\\)]", "");

        if (getPermissionState("sms") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "permissionCallback");
        } else {
            send(phone, message, call);
        }
    }

    @PluginMethod
    public void permissionCallback(PluginCall call) {
        if (getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED) {
            String phone = call.getString("phone");
            String message = call.getString("message");
            if (phone != null && message != null) {
                phone = phone.replaceAll("[\\s\\-\\(\\)]", "");
                send(phone, message, call);
            } else {
                call.reject("Missing parameters");
            }
        } else {
            call.reject("SMS Permission denied by user");
        }
    }

    private void send(String phone, String message, PluginCall call) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                smsManager = SmsManager.getDefault();
            }

            // Split message into multipart chunks to support Unicode emojis and long URLs
            ArrayList<String> parts = smsManager.divideMessage(message);
            Log.d(TAG, "Dispatching SMS to: " + phone + " in " + parts.size() + " part(s)");

            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phone, null, message, null, null);
            }

            Log.d(TAG, "SMS successfully sent via cellular modem to: " + phone);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS to " + phone + ": " + e.getMessage(), e);
            call.reject("Failed to send SMS: " + e.getMessage(), e);
        }
    }
}
