/**
 * ContactCard
 *
 * Displays a single emergency contact in a card format.
 * Shows avatar, name, phone, optional relationship badge, and edit/delete actions.
 * Follows the existing GlassCard visual style.
 */

import { Phone, Pencil, Trash2, UserCircle, Smartphone, Keyboard } from "lucide-react";
import type { EmergencyContact } from "../../types/emergencyContact";

interface ContactCardProps {
  contact: EmergencyContact;
  /** Index position in the list (1-based), displayed in the avatar */
  index: number;
  /** Called when the user taps the Edit button */
  onEdit: (contact: EmergencyContact) => void;
  /** Called when the user taps the Delete button */
  onDelete: (contact: EmergencyContact) => void;
  /** Whether any save/delete operation is in progress */
  disabled?: boolean;
}

export function ContactCard({
  contact,
  index,
  onEdit,
  onDelete,
  disabled,
}: ContactCardProps) {
  /** First letter of the contact name for the avatar */
  const initial = contact.name.charAt(0).toUpperCase();

  /** Format phone for display with spaces */
  const formatPhone = (phone: string): string => {
    // If already has country code, format with spaces
    if (phone.startsWith("+")) {
      const code = phone.slice(0, 3);
      const rest = phone.slice(3);
      if (rest.length === 10) {
        return `${code} ${rest.slice(0, 5)} ${rest.slice(5)}`;
      }
      return `${code} ${rest}`;
    }
    // Indian 10-digit format
    if (phone.length === 10) {
      return `${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  const handleDelete = () => {
    if (disabled) return;
    const confirmed = window.confirm(
      `Remove ${contact.name} from your emergency contacts?\n\nThey will no longer receive SOS alerts.`
    );
    if (confirmed) {
      onDelete(contact);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          <span className="text-[#D32F2F] font-bold text-lg">{initial}</span>
        </div>
        {/* Position badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#D32F2F] rounded-full flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{index}</span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-gray-900 truncate">
          {contact.name}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">
            {formatPhone(contact.phone)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {contact.relationship && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#D32F2F] border border-red-100">
              <UserCircle className="w-3 h-3 mr-0.5" />
              {contact.relationship}
            </span>
          )}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 border border-gray-100">
            {contact.source === "contact_picker" ? (
              <><Smartphone className="w-2.5 h-2.5 mr-0.5" /> Picked</>
            ) : (
              <><Keyboard className="w-2.5 h-2.5 mr-0.5" /> Manual</>
            )}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => !disabled && onEdit(contact)}
          disabled={disabled}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
          title="Edit contact"
          aria-label={`Edit ${contact.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={disabled}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          title="Delete contact"
          aria-label={`Delete ${contact.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
