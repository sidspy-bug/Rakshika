/**
 * AddContactModal
 *
 * Full-screen modal for adding or editing an emergency contact.
 * Supports two entry modes when adding:
 *   1. "Pick from Device" — invokes the Contact Picker API
 *   2. "Enter Manually" — shows a form with Name, Phone, Relationship fields
 *
 * In edit mode, the picker option is hidden and fields are pre-filled.
 *
 * Handles all validation inline and shows real-time phone validation feedback.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  Smartphone,
  Keyboard,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Heart,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PermissionBanner } from "./PermissionBanner";
import type {
  EmergencyContact,
  ContactFormData,
  ContactSource,
  ContactPermissionStatus,
} from "../../types/emergencyContact";
import { RELATIONSHIP_OPTIONS } from "../../types/emergencyContact";
import { validatePhone } from "../../services/emergencyContactService";

interface AddContactModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called to close the modal */
  onClose: () => void;
  /** Called when the user submits the form */
  onSave: (data: ContactFormData, source: ContactSource) => Promise<boolean>;
  /** Called when user picks a contact from the device */
  onPickFromDevice: () => Promise<ContactFormData | null>;
  /** Current Contact Picker API permission status */
  permissionStatus: ContactPermissionStatus;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Contact to edit (null = add new mode) */
  editTarget?: EmergencyContact | null;
}

export function AddContactModal({
  isOpen,
  onClose,
  onSave,
  onPickFromDevice,
  permissionStatus,
  isSaving,
  editTarget,
}: AddContactModalProps) {
  const isEditMode = !!editTarget;

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(true);
  const [isPicking, setIsPicking] = useState(false);

  // Pre-fill form in edit mode or reset in add mode
  useEffect(() => {
    if (isOpen) {
      if (editTarget) {
        setName(editTarget.name);
        setPhone(editTarget.phone);
        setRelationship(editTarget.relationship || "");
        setShowForm(true);
      } else {
        setName("");
        setPhone("");
        setRelationship("");
        setShowForm(false);
        setPickError(null);
      }
      setPhoneError(null);
      setNameError(null);
      setShowPermissionBanner(true);
    }
  }, [isOpen, editTarget]);

  // Real-time phone validation (debounced feel via onChange)
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (value.trim().length > 0) {
      const result = validatePhone(value);
      setPhoneError(result.isValid ? null : result.error || null);
    } else {
      setPhoneError(null);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim().length > 0) {
      setNameError(null);
    }
  };

  // Pick from device contacts
  const handlePick = async () => {
    setIsPicking(true);
    setPickError(null);

    try {
      const result = await onPickFromDevice();
      if (result) {
        setName(result.name);
        setPhone(result.phone);
        setRelationship(result.relationship || "");
        setShowForm(true);
        setPhoneError(null);
      }
      // null = user cancelled, do nothing
    } catch (err: any) {
      setPickError(
        err.message || "Could not read contact. Please enter details manually."
      );
      setShowForm(true);
    } finally {
      setIsPicking(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    let hasError = false;

    if (!name.trim()) {
      setNameError("Name is required.");
      hasError = true;
    }

    const phoneResult = validatePhone(phone);
    if (!phoneResult.isValid) {
      setPhoneError(phoneResult.error || "Invalid phone number.");
      hasError = true;
    }

    if (hasError) return;

    const formData: ContactFormData = {
      name: name.trim(),
      phone: phoneResult.normalized,
      relationship: relationship || undefined,
    };

    const source: ContactSource = editTarget
      ? editTarget.source
      : "manual_entry";

    const success = await onSave(formData, source);
    if (success) {
      onClose();
    }
  };

  const isPickerAvailable =
    permissionStatus !== "unsupported" && permissionStatus !== "denied";

  const isFormValid =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    !phoneError;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSaving) onClose();
        }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between z-10 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">
                  {isEditMode ? "Edit Contact" : "Add Emergency Contact"}
                </h2>
                <p className="text-xs text-gray-500">
                  {isEditMode
                    ? "Update contact details"
                    : "This person will be alerted during SOS"}
                </p>
              </div>
            </div>
            <button
              onClick={() => !isSaving && onClose()}
              disabled={isSaving}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Entry Mode Selection (only for new contacts) */}
            {!isEditMode && !showForm && (
              <div className="space-y-4">
                {/* Permission Banner */}
                {permissionStatus !== "unsupported" && showPermissionBanner && (
                  <PermissionBanner
                    isDenied={permissionStatus === "denied"}
                    onDismiss={() => setShowPermissionBanner(false)}
                  />
                )}

                {/* Pick error */}
                {pickError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">
                      {pickError}
                    </p>
                  </div>
                )}

                {/* Pick from Device */}
                {isPickerAvailable && (
                  <button
                    onClick={handlePick}
                    disabled={isPicking}
                    className="w-full p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-dashed border-red-200 rounded-2xl flex items-center gap-4 hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-red-100 group-hover:shadow-md transition-shadow">
                      {isPicking ? (
                        <Loader2 className="w-6 h-6 text-[#D32F2F] animate-spin" />
                      ) : (
                        <Smartphone className="w-6 h-6 text-[#D32F2F]" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-sm text-gray-900">
                        {isPicking
                          ? "Opening Contacts..."
                          : "Pick from Device Contacts"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Quick import — only the selected contact is read
                      </p>
                    </div>
                  </button>
                )}

                {/* Divider */}
                {isPickerAvailable && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}

                {/* Manual Entry */}
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full p-5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center gap-4 hover:border-gray-400 hover:bg-gray-100 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow">
                    <Keyboard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-gray-900">
                      Enter Manually
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type the contact's name and phone number
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Contact Form */}
            {(showForm || isEditMode) && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  icon={<User className="w-5 h-5" />}
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  error={nameError || undefined}
                  required
                  autoFocus={!isEditMode}
                />

                <Input
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone Number"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  error={phoneError || undefined}
                  required
                />

                {/* Relationship Selector */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-gray-400" />
                    Relationship (Optional)
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] focus-visible:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowForm(false)}
                      disabled={isSaving}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className={`${isEditMode ? "w-full" : "flex-[2]"}`}
                    disabled={!isFormValid || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isEditMode ? (
                      "Update Contact"
                    ) : (
                      "Save as Emergency Contact"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
