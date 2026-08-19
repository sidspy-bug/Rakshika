package com.rakshika.safety;

import android.telephony.SmsManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.Manifest;

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

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phone = call.getString("phone");
        String message = call.getString("message");
        if (phone == null || message == null) {
            call.reject("Must provide phone and message");
            return;
        }

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
            send(phone, message, call);
        } else {
            call.reject("Permission denied");
        }
    }

    private void send(String phone, String message, PluginCall call) {
        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(phone, null, message, null, null);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to send SMS", e);
        }
    }
}
