'use client';

import { useState } from 'react';

interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: 'upcoming' | 'active' | 'closed';
  last_modified_at: string | null;
  last_modified_by: string | null;
}

interface ConfigPanelProps {
  config: AssessmentConfig;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: (newDueDate: string) => Promise<boolean>;
}

// Status badge colors — F08 US-8.1: "Status computed dynamically: Upcoming / Active / Closed"
const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-800 border border-green-200',
  closed:   'bg-gray-100  text-gray-700  border border-gray-200',
  upcoming: 'bg-blue-100  text-blue-800  border border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  active:   '● Active',
  closed:   '○ Closed',
  upcoming: '◌ Upcoming',
};

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

// ConfigPanel — F08 §Assessment Configuration Management (US-8.1, US-8.2, US-8.3)
// UX-Mockup Screen 08: read/edit states, confirmation dialog
// TechArch SPEC-COMP: ConfigPanel.tsx, configService
export function ConfigPanel({ config, saving, saveError, saveSuccess, onSave }: ConfigPanelProps) {
  // Edit state
  const [editing, setEditing] = useState(false);
  // Date value in YYYY-MM-DD (date input) and time in HH:MM (time input)
  const [newDateVal, setNewDateVal] = useState('');
  const [newTimeVal, setNewTimeVal] = useState('');
  const [dateError, setDateError] = useState('');
  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDueDate, setPendingDueDate] = useState('');
  // Copy link feedback
  const [copied, setCopied] = useState(false);

  function openEdit() {
    // Pre-populate with current due date
    const current = new Date(config.due_date);
    const dateStr = current.toISOString().slice(0, 10); // YYYY-MM-DD
    const hours   = String(current.getHours()).padStart(2, '0');
    const minutes = String(current.getMinutes()).padStart(2, '0');
    setNewDateVal(dateStr);
    setNewTimeVal(`${hours}:${minutes}`);
    setDateError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDateError('');
  }

  // [Save Changes] → validate → open confirmation dialog
  function handleSaveClick() {
    if (!newDateVal || !newTimeVal) {
      setDateError('Please provide a valid date and time.');
      return;
    }
    // Build ISO string from date + time inputs (interpret as local time)
    const combined = `${newDateVal}T${newTimeVal}:00`;
    const parsed = new Date(combined);
    if (isNaN(parsed.getTime())) {
      setDateError('Please provide a valid date and time.');
      return;
    }
    setDateError('');
    setPendingDueDate(parsed.toISOString());
    setShowConfirm(true);
  }

  function cancelConfirm() {
    setShowConfirm(false);
  }

  // [Confirm Change] → PATCH /api/config
  async function handleConfirm() {
    setShowConfirm(false);
    const ok = await onSave(pendingDueDate);
    if (ok) {
      setEditing(false);
    }
  }

  const isPastDate = pendingDueDate ? new Date(pendingDueDate) < new Date() : false;

  function handleCopyLink() {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Success toast — F08 US-8.2: "Due date updated successfully." */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
          <span>✓</span>
          <span>Due date updated successfully.</span>
        </div>
      )}

      {/* Error toast — F08: "Could not save configuration. Please try again." */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <span>⚠</span>
          <span>{saveError}</span>
        </div>
      )}

      {/* Config card — UX-Mockup Screen 08 Layout: read state */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Assessment Configuration</h2>

        <dl className="flex flex-col gap-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Status</dt>
            <dd>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[config.status] ?? STATUS_STYLES.active}`}>
                {STATUS_LABELS[config.status] ?? config.status}
              </span>
            </dd>
          </div>

          {/* Launch Date */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Launch Date</dt>
            <dd className="text-sm text-gray-800">{formatDate(config.launch_date)}</dd>
          </div>

          {/* Due Date — editable */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500 w-36">Due Date</dt>
              {!editing ? (
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-800">{formatDateTime(config.due_date)}</span>
                  <button
                    onClick={openEdit}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    aria-label="Edit due date"
                  >
                    Edit ✏
                  </button>
                </dd>
              ) : (
                <dd className="flex-1 ml-4">
                  {/* Inline date/time picker — UX-Mockup Screen 08: "New Due Date & Time" */}
                  <div className="flex flex-col gap-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <label className="text-xs font-medium text-gray-600">New Due Date & Time</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={newDateVal}
                        onChange={e => { setNewDateVal(e.target.value); setDateError(''); }}
                        className={`border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dateError ? 'border-red-400' : 'border-gray-300'}`}
                        aria-label="New due date"
                      />
                      <input
                        type="time"
                        value={newTimeVal}
                        onChange={e => { setNewTimeVal(e.target.value); setDateError(''); }}
                        className={`border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dateError ? 'border-red-400' : 'border-gray-300'}`}
                        aria-label="New due time"
                      />
                    </div>
                    {/* F08 US-8.2 validation error — "Please provide a valid date and time." */}
                    {dateError && (
                      <p className="text-xs text-red-600" role="alert">{dateError}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveClick}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </dd>
              )}
            </div>
          </div>

          {/* Last Modified — config_audit_log info */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Last Modified</dt>
            <dd className="text-sm text-gray-600">
              {config.last_modified_at
                ? `${formatDate(config.last_modified_at)}${config.last_modified_by ? ` by ${config.last_modified_by}` : ''}`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Copy Assessment Link card — UX-Mockup Screen 08 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">🔗 Copy Assessment Link</p>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700 whitespace-nowrap"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Confirmation Dialog — UX-Mockup Screen 08: "Confirm Due Date Change" modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={cancelConfirm} // Clicking backdrop = Cancel (UX Pattern 4)
          onKeyDown={e => e.key === 'Escape' && cancelConfirm()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 mb-1">
              Confirm Due Date Change
            </h3>
            <hr className="my-3 border-gray-200" />

            <p className="text-sm text-gray-600 mb-4">
              You are about to change the assessment due date:
            </p>

            <dl className="flex flex-col gap-2 mb-4 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-12">From:</dt>
                <dd className="text-gray-800 font-medium">{formatDateTime(config.due_date)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-12">To:</dt>
                <dd className="text-gray-800 font-medium">{formatDateTime(pendingDueDate)}</dd>
              </div>
            </dl>

            {/* Caution warning — UX-Mockup Screen 08: "past date" caution */}
            {isPastDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs mb-4">
                ⚠ This date is in the past. Setting it will immediately close the assessment.
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800 text-xs mb-5">
              ⚠ This will take effect immediately for all active respondents. No application restart is required.
            </div>

            {/* Default focus on Cancel (safer action) per UX Pattern 4 */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelConfirm}
                autoFocus
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Updating…' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
