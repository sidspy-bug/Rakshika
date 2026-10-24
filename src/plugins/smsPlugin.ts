import { registerPlugin } from "@capacitor/core";

export interface SmsSendOptions {
  phone?: string;
  phoneNumber?: string;
  message: string;
}

export interface SmsSendResult {
  success?: boolean;
  message?: string;
  error?: string;
}

export interface SmsPluginInterface {
  sendSms(options: { phone: string; message: string }): Promise<void>;
  sendDirectSms(options: SmsSendOptions): Promise<SmsSendResult>;
}

export const SmsPlugin = registerPlugin<any>("SmsPlugin");
