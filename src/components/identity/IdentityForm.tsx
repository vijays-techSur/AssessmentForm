'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { TeamType } from '@/lib/api/types';

const TEAM_TYPE_OPTIONS: { value: TeamType; label: string; description: string }[] = [
  { value: 'program_project',       label: 'Program / Project',        description: 'Managing delivery, timelines, or roadmaps' },
  { value: 'platform_engineering',  label: 'Platform Engineering',     description: 'Building or operating developer tooling' },
  { value: 'infrastructure_cloud',  label: 'Infrastructure / Cloud',   description: 'Cloud, infrastructure, or SRE teams' },
  { value: 'data_api_governance',   label: 'Data / API Governance',    description: 'Data standards, APIs, or compliance' },
];

// Section counts per team type from FRD F03 routing table (RTM §3.3)
const SECTION_COUNTS: Record<TeamType, number> = {
  program_project: 5,
  platform_engineering: 7,
  infrastructure_cloud: 6,
  data_api_governance: 6,
};

interface Props {
  onSuccess: (params: { email: string; name: string; teamType: TeamType }) => Promise<void>;
  isLoading?: boolean;
  serverError?: string | null;
  dueDate?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function IdentityForm({ onSuccess, isLoading, serverError, dueDate }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [teamType, setTeamType] = useState<TeamType | ''>('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  const emailValid = isValidEmail(email);
  const nameValid = name.trim().length >= 2;
  const canSubmit = emailValid && nameValid && teamType !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !teamType) return;
    await onSuccess({ email: email.trim(), name: name.trim(), teamType });
  };

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <span className="font-semibold text-gray-800">Developer Platform Assessment</span>
        <Link
          href="/dashboard/login"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          System Owner Dashboard →
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Platform Assessment</h1>
          <p className="text-gray-600 mt-1">Help us understand your team&apos;s needs and readiness for Developer Platform tooling.</p>
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span>⏱ ~15–20 minutes</span>
            <span>📋 Multi-section assessment</span>
            <span>🔒 Auto-saved</span>
          </div>
        </div>

        {/* Server error (e.g., System Owner email) */}
        {serverError && (
          <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Work Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailError(emailValid || !email ? '' : 'Please enter a valid email address.')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-400' : 'border-gray-300'}`}
              aria-describedby={emailError ? 'email-error' : undefined}
              aria-invalid={!!emailError}
              disabled={isLoading}
            />
            {emailError && <p id="email-error" className="text-red-600 text-xs mt-1">{emailError}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameError(nameValid || !name ? '' : 'Please enter your full name (at least 2 characters).')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
              aria-describedby={nameError ? 'name-error' : undefined}
              aria-invalid={!!nameError}
              disabled={isLoading}
            />
            {nameError && <p id="name-error" className="text-red-600 text-xs mt-1">{nameError}</p>}
          </div>

          {/* Team Type */}
          <div>
            <label htmlFor="team-type" className="block text-sm font-medium text-gray-700 mb-1">
              Your Team Type <span className="text-red-500">*</span>
            </label>
            <select
              id="team-type"
              value={teamType}
              onChange={(e) => setTeamType(e.target.value as TeamType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">Select your team type</option>
              {TEAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
              ))}
            </select>
            {/* Section count preview (US-1.1, UX Screen 00) */}
            {teamType && (
              <p className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-2">
                ℹ You&apos;ll complete {SECTION_COUNTS[teamType]} sections tailored to{' '}
                {TEAM_TYPE_OPTIONS.find((o) => o.value === teamType)?.label}.
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isLoading ? 'Starting your assessment…' : 'Start Assessment →'}
          </button>

          {formattedDue && (
            <p className="text-center text-xs text-gray-400">Assessment closes: {formattedDue}</p>
          )}
        </form>
      </div>
      </div>
    </div>
  );
}
