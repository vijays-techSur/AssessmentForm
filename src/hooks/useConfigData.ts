'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: 'upcoming' | 'active' | 'closed';
  last_modified_at: string | null;
  last_modified_by: string | null;
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useConfigData — F08 §View + Update Configuration (US-8.1, US-8.2)
// GET /api/config on mount; patchConfig triggers PATCH /api/config { due_date }
// TechArch §4.3: AssessmentConfig response shape
export function useConfigData() {
  const [config, setConfig] = useState<AssessmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('CONFIG_LOAD_FAILED');
      setConfig(await res.json());
    } catch {
      setError('Could not load assessment configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // patchConfig — PATCH /api/config { due_date }
  // F08 §Update Due Date: writes config_audit_log; returns updated AssessmentConfig
  const patchConfig = useCallback(async (newDueDate: string): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ due_date: newDueDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setSaveError(body?.error?.message ?? 'Could not save configuration. Please try again.');
        return false;
      }
      const updated = await res.json() as AssessmentConfig;
      setConfig(updated);
      setSaveSuccess(true);
      // Auto-clear success flag after 4 seconds
      setTimeout(() => setSaveSuccess(false), 4000);
      return true;
    } catch {
      setSaveError('Could not save configuration. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { config, loading, error, saving, saveError, saveSuccess, patchConfig };
}
