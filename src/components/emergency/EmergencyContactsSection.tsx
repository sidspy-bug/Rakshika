/**
 * EmergencyContactsSection
 *
 * Main orchestrator component for the Emergency Contacts feature.
 * Rendered inside ProfileScreen, replacing the old primary/secondary contacts form.
 *
 * Manages the contact list display, add/edit modal, and all user feedback.
 * Uses the useEmergencyContacts hook for all state and operations.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "../ui/Button";
import { ContactCard } from "./ContactCard";
import { AddContactModal } from "./AddContactModal";
import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import { MAX_EMERGENCY_CONTACTS } from "../../types/emergencyContact";
import type {
  EmergencyContact,
  ContactFormData,
  ContactSource,
} from "../../types/emergencyContact";

export function EmergencyContactsSection() {
  const {
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
    clearMessages,
  } = useEmergencyContacts();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmergencyContact | null>(null);

  const isAtMax = contacts.length >= MAX_EMERGENCY_CONTACTS;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleOpenAdd = () => {
    setEditTarget(null);
    setIsModalOpen(true);
    clearMessages();
  };

  const handleOpenEdit = (contact: EmergencyContact) => {
    setEditTarget(contact);
    setIsModalOpen(true);
    clearMessages();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
  };

  const handleSave = async (
    data: ContactFormData,
    source: ContactSource
  ): Promise<boolean> => {
    if (editTarget) {
      return editContact(editTarget.id, data);
    }
    const result = await addContact(data, source);
    return result !== null;
  };

  const handleDelete = async (contact: EmergencyContact) => {
    await removeContact(contact.id);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#D32F2F]" />
          <h3 className="font-bold text-base text-gray-900">
            Emergency Contacts
          </h3>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            isAtMax
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {contacts.length}/{MAX_EMERGENCY_CONTACTS}
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        These people will receive an emergency SMS with your live location when
        you trigger SOS. Add up to {MAX_EMERGENCY_CONTACTS} trusted contacts.
      </p>

      {/* Toast Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-800 font-medium flex-1">
              {successMessage}
            </p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-medium flex-1">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="w-8 h-8 text-[#D32F2F] animate-spin" />
          <p className="text-xs text-gray-400 font-medium">
            Loading contacts...
          </p>
        </div>
      ) : (
        <>
          {/* Contact List */}
          {contacts.length > 0 ? (
            <div className="space-y-2.5">
              {contacts.map((contact, idx) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ContactCard
                    contact={contact}
                    index={idx + 1}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    disabled={isSaving}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-10 gap-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-[#D32F2F]/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">
                  No emergency contacts yet
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                  Add trusted people who should be alerted immediately during an
                  emergency.
                </p>
              </div>
            </div>
          )}

          {/* Add Button */}
          <Button
            className="w-full mt-3"
            onClick={handleOpenAdd}
            disabled={isAtMax || isSaving}
          >
            {isAtMax ? (
              <>
                <Users className="w-4 h-4 mr-2" />
                Maximum {MAX_EMERGENCY_CONTACTS} Contacts Reached
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Emergency Contact
              </>
            )}
          </Button>
        </>
      )}

      {/* Add/Edit Modal */}
      <AddContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onPickFromDevice={pickFromDevice}
        permissionStatus={permissionStatus}
        isSaving={isSaving}
        editTarget={editTarget}
      />
    </div>
  );
}
