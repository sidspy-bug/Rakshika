/**
 * useEmergencyContacts Hook
 *
 * Custom React hook that encapsulates all state management and operations
 * for the Emergency Contacts feature. Provides a clean API for components
 * to load, add, edit, delete contacts, and invoke the device contact picker.
 *
 * Auto-loads contacts on mount and auto-dismisses feedback messages.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  EmergencyContact,
  ContactFormData,
  ContactSource,
  ContactPermissionStatus,
} from "../types/emergencyContact";
import {
  loadContacts,
  saveContact,
  updateContact,
  deleteContactById,
  checkContactPickerSupport,
  pickContact,
} from "../services/emergencyContactService";

/** Duration in ms before success/error messages auto-dismiss */
const MESSAGE_DISMISS_MS = 4000;

export function useEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<ContactPermissionStatus>(() => checkContactPickerSupport());

  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-dismiss feedback messages
  // ---------------------------------------------------------------------------

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setError(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
    }, MESSAGE_DISMISS_MS);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setSuccessMessage(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setError(null);
    }, MESSAGE_DISMISS_MS);
  }, []);

  /** Clears all feedback messages immediately */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Load contacts on mount
  // ---------------------------------------------------------------------------

  const refreshContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadContacts();
      setContacts(loaded);
    } catch (err: any) {
      console.error("Failed to load emergency contacts:", err);
      showError("Failed to load emergency contacts.");
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Adds a new emergency contact after validation.
   * @returns The created contact, or null if an error occurred.
   */
  const addContact = useCallback(
    async (
      data: ContactFormData,
      source: ContactSource
    ): Promise<EmergencyContact | null> => {
      setIsSaving(true);
      clearMessages();

      try {
        const created = await saveContact(data, source, contacts);
        setContacts((prev) => [...prev, created]);
        showSuccess(`${created.name} added as emergency contact.`);
        return created;
      } catch (err: any) {
        showError(err.message || "Failed to save contact.");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [contacts, showSuccess, showError, clearMessages]
  );

  /**
   * Updates an existing emergency contact.
   */
  const editContact = useCallback(
    async (id: string, data: ContactFormData): Promise<boolean> => {
      setIsSaving(true);
      clearMessages();

      try {
        const updated = await updateContact(id, data, contacts);
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        showSuccess(`${updated.name} updated successfully.`);
        return true;
      } catch (err: any) {
        showError(err.message || "Failed to update contact.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [contacts, showSuccess, showError, clearMessages]
  );

  /**
   * Removes an emergency contact after confirmation.
   */
  const removeContact = useCallback(
    async (id: string): Promise<boolean> => {
      const target = contacts.find((c) => c.id === id);
      setIsSaving(true);
      clearMessages();

      try {
        await deleteContactById(id, contacts);
        setContacts((prev) => prev.filter((c) => c.id !== id));
        showSuccess(
          target
            ? `${target.name} removed from emergency contacts.`
            : "Contact removed."
        );
        return true;
      } catch (err: any) {
        showError(err.message || "Failed to delete contact.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [contacts, showSuccess, showError, clearMessages]
  );

  // ---------------------------------------------------------------------------
  // Contact Picker
  // ---------------------------------------------------------------------------

  /**
   * Invokes the device Contact Picker API.
   * Returns the selected contact data, or null if cancelled/unsupported.
   */
  const pickFromDevice = useCallback(async (): Promise<ContactFormData | null> => {
    const support = checkContactPickerSupport();
    setPermissionStatus(support);

    if (support === "unsupported") {
      return null;
    }

    try {
      const result = await pickContact();
      if (result) {
        setPermissionStatus("granted");
      }
      return result;
    } catch (err: any) {
      console.error("Contact picker failed:", err);

      // If the error indicates a permission issue
      if (
        err.message?.includes("permission") ||
        err.name === "NotAllowedError" ||
        err.name === "SecurityError"
      ) {
        setPermissionStatus("denied");
      }

      showError(
        err.message || "Could not access device contacts. Try entering manually."
      );
      return null;
    }
  }, [showError]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    contacts,
    isLoading,
    isSaving,
    error,
    successMessage,
    permissionStatus,
    addContact,
    editContact,
    removeContact,
    pickFromDevice,
    refreshContacts,
    clearMessages,
  };
}
