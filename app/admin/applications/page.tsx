'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import clubs from '@/data/clubs.json';

type PendingApplication = {
  id: string;
  user_id: string;
  club_id: string;
  status: 'pending' | 'approved' | 'rejected';
  student_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  /** Thai nickname / prename from students (stored on apply). */
  prename?: string | null;
  year?: number | null;
  email?: string | null;
  submitted_at?: string | null;
  applied_at: string;
  reviewed_at?: string | null;
  notes?: string | null;
  /** Per-club form answers (JSON from join form). */
  responses?: Record<string, unknown> | null;
};

function formatFormFieldKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFormValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function getResponseEntries(responses: unknown): [string, string][] {
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    return [];
  }
  return Object.entries(responses as Record<string, unknown>).map(([k, v]) => [k, formatFormValue(v)]);
}

function prettyClubName(clubId: string): string {
  return clubId.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

type EmailReport = {
  resendConfigured: boolean;
  fromUsed: string;
  failureSamples: string[];
  missingStudentEmailCount: number;
  applicationsUpdated: number;
};

function formatEmailReportSummary(report: EmailReport | undefined): string {
  if (!report) return '';
  const bits: string[] = [];
  if (!report.resendConfigured) {
    bits.push(
      'Emails were not sent: add RESEND_API_KEY=re_… from resend.com to .env.local and restart the dev server.'
    );
  } else if (report.failureSamples.length === 0 && report.missingStudentEmailCount === 0) {
    bits.push(
      'Resend accepted the notification sends — check inboxes (and spam) and the Resend dashboard for delivery.'
    );
  } else {
    if (report.missingStudentEmailCount > 0) {
      bits.push(`${report.missingStudentEmailCount} row(s) had no student email (Auth + saved application email were both empty).`);
    }
    if (report.failureSamples.length > 0) {
      bits.push(`Send errors: ${report.failureSamples.slice(0, 5).join(' · ')}`);
    }
  }
  bits.push(
    `From: ${report.fromUsed}. If Resend says invalid_from, verify the sending domain in Resend or set RESEND_FROM. If it says API key is invalid, paste a fresh key from resend.com/api-keys (starts with re_) into Vercel RESEND_API_KEY and redeploy.`
  );
  return `\n\n${bits.join(' ')}`;
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<PendingApplication[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkAcceptanceMessage, setBulkAcceptanceMessage] = useState('');
  const [bulkClubId, setBulkClubId] = useState<string>(
    (clubs as Array<{ id: string }>).find((c) => c.id !== 'blank')?.id ?? ''
  );
  const [exportYearGroup, setExportYearGroup] = useState<number | 'all'>(7);
  const [exportClubId, setExportClubId] = useState<string>(
    (clubs as Array<{ id: string }>).find((c) => c.id !== 'blank')?.id ?? 'all'
  );
  const [exportStatusScope, setExportStatusScope] = useState<'enrolled' | 'pending' | 'all'>('enrolled');
  const [view, setView] = useState<'pending' | 'enrolled' | 'denied' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  const sessionEmail = useMemo(() => session?.user?.email ?? '', [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    void fetchApplications();
  }, [session, status, router]);

  function getDisplayName(item: PendingApplication): string {
    const first = (item.first_name ?? '').trim();
    const last = (item.last_name ?? '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    const sid = (item.student_id ?? '').trim();
    if (sid) return sid;
    const email = (item.email ?? '').trim();
    if (email) return email;
    return item.user_id;
  }

  const clubNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clubs as Array<{ id: string; name: string }>) {
      map.set(c.id, c.name);
    }
    return map;
  }, []);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (view === 'pending') return item.status === 'pending';
      if (view === 'enrolled') return item.status === 'approved';
      if (view === 'denied') return item.status === 'rejected';
      return true;
    });
    const filtered2 = filtered.filter((item) => {
      if (clubFilter !== 'all' && item.club_id !== clubFilter) return false;
      if (yearFilter !== 'all' && Number(item.year ?? -1) !== yearFilter) return false;
      if (!q) return true;

      const clubName = (clubNameById.get(item.club_id) ?? prettyClubName(item.club_id)).toLowerCase();
      const name = getDisplayName(item).toLowerCase();
      const studentId = String(item.student_id ?? '').toLowerCase();
      const email = String(item.email ?? '').toLowerCase();
      const year = item.year != null ? String(item.year) : '';
      const prename = String(item.prename ?? '').toLowerCase();
      const responsesText = item.responses
        ? JSON.stringify(item.responses).toLowerCase()
        : '';

      return (
        clubName.includes(q) ||
        item.club_id.toLowerCase().includes(q) ||
        name.includes(q) ||
        studentId.includes(q) ||
        email.includes(q) ||
        year.includes(q) ||
        prename.includes(q) ||
        responsesText.includes(q)
      );
    });
    return filtered2.sort((a, b) => {
      const clubA = (clubNameById.get(a.club_id) ?? prettyClubName(a.club_id)).toLowerCase()
      const clubB = (clubNameById.get(b.club_id) ?? prettyClubName(b.club_id)).toLowerCase()
      if (clubA !== clubB) return clubA.localeCompare(clubB)

      const nameA = getDisplayName(a).toLowerCase()
      const nameB = getDisplayName(b).toLowerCase()
      if (nameA !== nameB) return nameA.localeCompare(nameB)

      return String(a.id).localeCompare(String(b.id))
    });
  }, [items, view, query, clubFilter, yearFilter, clubNameById]);

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch('/api/admin/applications', { cache: 'no-store' });

    if (res.status === 401) {
      router.push('/auth/signin');
      return;
    }

    if (res.status === 403) {
      setError('You are signed in, but your account is not allowed to access admin approvals.');
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError('Failed to load applications.');
      setLoading(false);
      return;
    }

    const data = (await res.json()) as PendingApplication[];
    setItems(data);
    setSelectedIds(new Set());
    setLoading(false);
  }

  async function seedMockData() {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/applications/seed', { method: 'POST' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to seed mock data')
      }
      const payload = await res.json().catch(() => ({}))
      const count = Number(payload.insertedOrUpdated ?? 0)
      setSuccess(`Seeded ${count} mock application(s).`)
      await fetchApplications()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed mock data')
    }
  }

  async function updateStatus(id: string, newStatus: 'approved' | 'rejected') {
    if (newStatus === 'rejected') {
      const first = window.confirm('Deny this application?')
      if (!first) return
      const second = window.confirm('Are you sure? The student will be marked as denied.')
      if (!second) return
    }

    setSavingId(id);
    setError(null);
    setSuccess(null);

    const target = items.find((item) => item.id === id);

    const res = await fetch('/api/admin/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status: newStatus,
        notes: notesById[id] ?? '',
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to update application.');
      setSavingId(null);
      return;
    }

    const payload = (await res.json().catch(() => ({}))) as {
      application?: PendingApplication;
      emailReport?: EmailReport;
    };
    const updated = payload.application;
    if (updated?.id) {
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: newStatus, reviewed_at: new Date().toISOString(), notes: notesById[id] ?? item.notes ?? null }
            : item
        )
      );
    }
    const clubName = target ? prettyClubName(target.club_id) : 'application';
    const base =
      newStatus === 'approved'
        ? `${clubName} was approved (enrolled).`
        : `${clubName} was denied.`;
    setSuccess(`${base}${formatEmailReportSummary(payload.emailReport)}`);
    setSavingId(null);
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleItems.map((item) => item.id)));
  }

  function selectAllPendingForBulkClub() {
    if (!bulkClubId) return;
    setError(null);
    const ids = items
      .filter((i) => i.club_id === bulkClubId && i.status === 'pending')
      .map((i) => i.id);
    setSelectedIds(new Set(ids));
    setClubFilter(bulkClubId);
    setView('pending');
    setSuccess(
      ids.length
        ? `Selected ${ids.length} pending application(s) for ${clubNameById.get(bulkClubId) ?? prettyClubName(bulkClubId)}. Uncheck anyone you want to leave out, then approve.`
        : `No pending applications for ${clubNameById.get(bulkClubId) ?? prettyClubName(bulkClubId)}.`
    );
  }

  async function handleBulkUpdate(status: 'approved' | 'rejected') {
    if (selectedIds.size === 0) return;

    if (status === 'rejected') {
      const first = window.confirm(`Deny ${selectedIds.size} selected application(s)?`)
      if (!first) return
      const second = window.confirm('Are you sure? This will mark all selected as denied.')
      if (!second) return
    }

    if (status === 'approved') {
      const pendingOnly = Array.from(selectedIds).every((id) => {
        const row = items.find((i) => i.id === id);
        return row?.status === 'pending';
      });
      if (!pendingOnly) {
        setError('Bulk approve only works for applications that are still pending. Deselect enrolled or denied rows.');
        return;
      }
    }

    setBulkLoading(true);
    setError(null);
    setSuccess(null);

    const ids = Array.from(selectedIds);

    const res = await fetch('/api/admin/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids,
        status,
        notes: bulkNotes,
        acceptanceMessage: status === 'approved' ? bulkAcceptanceMessage.trim() || undefined : undefined,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Bulk update failed.');
      setBulkLoading(false);
      return;
    }

    const payload = (await res.json()) as {
      updatedCount?: number;
      applications?: PendingApplication[];
      emailReport?: EmailReport;
    };
    const updatedCount = Number(payload.updatedCount ?? ids.length);
    const updatedRows = (payload.applications ?? []) as PendingApplication[];
    if (Array.isArray(updatedRows) && updatedRows.length > 0) {
      const byId = new Map(updatedRows.map((row) => [row.id, row]));
      setItems((prev) => prev.map((item) => byId.get(item.id) ?? item));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id)
            ? { ...item, status, reviewed_at: new Date().toISOString(), notes: bulkNotes || item.notes || null }
            : item
        )
      );
    }
    setSelectedIds(new Set());
    setBulkNotes('');
    setBulkAcceptanceMessage('');
    setSuccess(
      `${updatedCount} application(s) were updated.${formatEmailReportSummary(payload.emailReport)}`
    );
    setBulkLoading(false);
  }

  function downloadYearCsv() {
    const yg = exportYearGroup === 'all' ? 'all' : String(exportYearGroup);
    window.open(
      `/api/admin/applications/export?groupBy=year&yearGroup=${encodeURIComponent(yg)}&statusScope=${exportStatusScope}`,
      '_blank'
    );
  }

  function downloadClubCsv() {
    if (!exportClubId) return;
    window.open(
      `/api/admin/applications/export?groupBy=club&clubId=${encodeURIComponent(exportClubId)}&statusScope=${exportStatusScope}`,
      '_blank'
    );
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-deep">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-deep pt-24 pb-12">
      <Container size="narrow">
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-white">Admin Applications</h1>
            <p className="text-white/70 mt-2">Review pending applications, approve with an optional message, or deny.</p>
            <p className="text-white/50 text-sm mt-1">Signed in as: {sessionEmail || 'Unknown user'}</p>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={seedMockData}>
                  Seed mock applications
                </Button>
              </div>
            )}
          </header>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/60 text-sm">View:</span>
            <Button
              size="sm"
              variant={view === 'pending' ? 'primary' : 'outline'}
              onClick={() => { setView('pending'); setSelectedIds(new Set()); }}
            >
              Pending
            </Button>
            <Button
              size="sm"
              variant={view === 'enrolled' ? 'primary' : 'outline'}
              onClick={() => { setView('enrolled'); setSelectedIds(new Set()); }}
            >
              Enrolled
            </Button>
            <Button
              size="sm"
              variant={view === 'denied' ? 'primary' : 'outline'}
              onClick={() => { setView('denied'); setSelectedIds(new Set()); }}
            >
              Denied
            </Button>
            <Button
              size="sm"
              variant={view === 'all' ? 'primary' : 'outline'}
              onClick={() => { setView('all'); setSelectedIds(new Set()); }}
            >
              All
            </Button>
            <span className="text-white/50 text-sm ml-auto">{visibleItems.length} shown</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-white/70 text-sm mb-1">Search</label>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIds(new Set()); }}
                  placeholder="Name, student ID, email, club, year…"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Club</label>
                <select
                  value={clubFilter}
                  onChange={(e) => { setClubFilter(e.target.value); setSelectedIds(new Set()); }}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
                >
                  <option value="all" className="text-black">All clubs</option>
                  {(clubs as Array<{ id: string; name: string }>).filter((c) => c.id !== 'blank').map((c) => (
                    <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Year group</label>
                <select
                  value={String(yearFilter)}
                  onChange={(e) => {
                    const v = e.target.value
                    setYearFilter(v === 'all' ? 'all' : Number(v))
                    setSelectedIds(new Set())
                  }}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
                >
                  <option value="all" className="text-black">All years</option>
                  {[7, 8, 9, 10, 11, 12, 13].map((y) => (
                    <option key={y} value={y} className="text-black">Year {y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-300 whitespace-pre-line text-sm">
              {success}
            </div>
          )}

          {!error && visibleItems.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/70">
              No applications in this view.
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full text-[11px] leading-tight">
                <thead className="sticky top-0 z-10 bg-[rgba(15,23,42,0.92)] backdrop-blur border-b border-white/10">
                  <tr className="text-white/60 text-[10px] uppercase tracking-wide">
                    <th className="px-3 py-2 text-left w-[44px]">Sel</th>
                    <th className="px-3 py-2 text-left w-[190px]">Club</th>
                    <th className="px-3 py-2 text-left w-[170px]">Student</th>
                    <th className="px-3 py-2 text-left w-[100px]">Nickname</th>
                    <th className="px-3 py-2 text-left w-[60px]">Year</th>
                    <th className="px-3 py-2 text-left w-[240px]">Email</th>
                    <th className="px-3 py-2 text-left w-[110px]">Student ID</th>
                    <th className="px-3 py-2 text-left w-[95px]">Status</th>
                    <th className="px-3 py-2 text-left w-[90px]">Applied</th>
                    <th className="px-3 py-2 text-left w-[120px]">Form answers</th>
                    <th className="px-3 py-2 text-left w-[260px]">Notes</th>
                    <th className="px-3 py-2 text-left w-[150px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleItems.map((item) => {
                    const isSaving = savingId === item.id
                    const st = item.status
                    const clubName = clubNameById.get(item.club_id) ?? prettyClubName(item.club_id)
                    const appliedAt = new Date(item.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    const name = getDisplayName(item)
                    const responseEntries = getResponseEntries(item.responses)
                    const responseCount = responseEntries.length

                    return (
                      <Fragment key={item.id}>
                      <tr className="text-white/85 hover:bg-white/[0.03] align-middle">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => toggleSelect(item.id, e.target.checked)}
                            className="h-4 w-4"
                            aria-label="Select row"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-white truncate" title={clubName}>{clubName}</td>
                        <td className="px-3 py-2 truncate" title={name}>{name}</td>
                        <td className="px-3 py-2 text-white/75 truncate" title={item.prename ?? ''}>{item.prename?.trim() ? item.prename : '—'}</td>
                        <td className="px-3 py-2 text-white/75">{item.year != null ? `Y${item.year}` : '—'}</td>
                        <td className="px-3 py-2 text-white/70 truncate" title={item.email ?? ''}>{item.email ?? '—'}</td>
                        <td className="px-3 py-2 text-white/70 font-mono truncate" title={item.student_id ?? ''}>{item.student_id ?? '—'}</td>
                        <td className="px-3 py-2">
                          {st === 'pending' ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-200 border border-amber-500/25 text-[10px] font-semibold">
                              Pending
                            </span>
                          ) : st === 'approved' ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] font-semibold">
                              Enrolled
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/25 text-[10px] font-semibold">
                              Denied
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white/60 whitespace-nowrap">{appliedAt}</td>
                        <td className="px-3 py-2 align-top">
                          {responseCount === 0 ? (
                            <span className="text-white/40">—</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setExpandedResponseId((id) => (id === item.id ? null : item.id))
                              }
                              className="px-2 py-1 text-[10px] whitespace-nowrap"
                            >
                              {expandedResponseId === item.id ? 'Hide' : `View (${responseCount})`}
                            </Button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={notesById[item.id] ?? item.notes ?? ''}
                            onChange={(e) =>
                              setNotesById((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Optional note"
                            className="w-full rounded-md bg-white/10 border border-white/20 px-2 py-1 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {st === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(item.id, 'approved')}
                                  disabled={isSaving}
                                  className="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-[11px]"
                                >
                                  {isSaving ? 'Saving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(item.id, 'rejected')}
                                  disabled={isSaving}
                                  className="bg-rose-600 hover:bg-rose-500 px-2 py-1 text-[11px]"
                                >
                                  {isSaving ? 'Saving...' : 'Deny'}
                                </Button>
                              </>
                            )}
                            {st === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatus(item.id, 'rejected')}
                                disabled={isSaving}
                                className="bg-rose-600 hover:bg-rose-500 px-2 py-1 text-[11px]"
                              >
                                {isSaving ? 'Saving...' : 'Deny'}
                              </Button>
                            )}
                            {st === 'rejected' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatus(item.id, 'approved')}
                                disabled={isSaving}
                                className="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-[11px]"
                              >
                                {isSaving ? 'Saving...' : 'Re-enroll'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedResponseId === item.id && responseCount > 0 && (
                        <tr className="bg-white/[0.03]">
                          <td colSpan={12} className="px-3 py-2 border-t border-white/5">
                            <p className="text-[10px] text-white/45 uppercase tracking-wide mb-2">Question → answer (this club’s form fields)</p>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {responseEntries.map(([k, v]) => (
                                <div
                                  key={k}
                                  className="grid grid-cols-1 sm:grid-cols-[minmax(7rem,12rem)_1fr] gap-x-3 gap-y-0.5 text-[11px] border-b border-white/5 pb-1.5 last:border-0"
                                >
                                  <div className="text-white/55 font-medium break-words">{formatFormFieldKey(k)}</div>
                                  <div className="text-white/90 break-words font-mono whitespace-pre-wrap">{v}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Bulk actions (by club)</h2>
            <p className="text-white/70 text-sm">
              Choose a club, select every pending applicant for that club, then uncheck anyone you want to skip.
              Approve sends the optional club message below to each student (meeting day, room, expectations).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Club for bulk selection</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={bulkClubId}
                    onChange={(e) => setBulkClubId(e.target.value)}
                    className="flex-1 min-w-[12rem] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
                  >
                    {(clubs as Array<{ id: string; name: string }>)
                      .filter((c) => c.id !== 'blank')
                      .map((c) => (
                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                      ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllPendingForBulkClub}>
                    Select all pending
                  </Button>
                </div>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="text-white/80 text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleItems.length > 0 && selectedIds.size === visibleItems.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Select all in current table view
                </label>
                <span className="text-white/60 text-sm">{selectedIds.size} selected</span>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Notes (saved on each application; included in emails)</label>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Optional — stored on the application record"
                rows={2}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Acceptance message (email only, approvals)</label>
              <textarea
                value={bulkAcceptanceMessage}
                onChange={(e) => setBulkAcceptanceMessage(e.target.value)}
                placeholder="e.g. First meeting: Tuesday lunch, room 12-101. Bring your planner…"
                rows={4}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
              />
              <p className="text-white/45 text-xs mt-1">Not saved on the row — only appended to the student approval email for this bulk send.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleBulkUpdate('approved')}
                disabled={bulkLoading || selectedIds.size === 0}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {bulkLoading ? 'Processing...' : 'Bulk approve selected'}
              </Button>
              <Button
                onClick={() => handleBulkUpdate('rejected')}
                disabled={bulkLoading || selectedIds.size === 0}
                className="bg-rose-600 hover:bg-rose-500"
              >
                {bulkLoading ? 'Processing...' : 'Bulk deny selected'}
              </Button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">CSV Downloads</h2>
            <p className="text-white/70 text-sm">
              Download CSVs by year or club. Choose enrolled, pending, or all application statuses.
            </p>

            <div className="space-y-2">
              <label className="block text-white/70 text-sm">Status Scope</label>
              <select
                value={exportStatusScope}
                onChange={(e) => {
                  const v = e.target.value;
                  setExportStatusScope(v === 'all' || v === 'pending' ? v : 'enrolled');
                }}
                className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white w-full md:max-w-xs"
              >
                <option value="enrolled" className="text-black">Enrolled only (approved)</option>
                <option value="pending" className="text-black">Pending only</option>
                <option value="all" className="text-black">All statuses</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-white/70 text-sm">By Year Group</label>
                <div className="flex gap-2">
                  <select
                    value={exportYearGroup === 'all' ? 'all' : String(exportYearGroup)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExportYearGroup(v === 'all' ? 'all' : Number(v));
                    }}
                    className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white w-full"
                  >
                    <option value="all" className="text-black">All year groups</option>
                    {[7, 8, 9, 10, 11, 12, 13].map((year) => (
                      <option key={year} value={year} className="text-black">Year {year}</option>
                    ))}
                  </select>
                  <Button onClick={downloadYearCsv} variant="outline">Download</Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-white/70 text-sm">By Club</label>
                <div className="flex gap-2">
                  <select
                    value={exportClubId}
                    onChange={(e) => setExportClubId(e.target.value)}
                    className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white w-full"
                  >
                    <option value="all" className="text-black">All clubs</option>
                    {clubs
                      .filter((club) => club.id !== 'blank')
                      .map((club) => (
                        <option key={club.id} value={club.id} className="text-black">{club.name}</option>
                      ))}
                  </select>
                  <Button onClick={downloadClubCsv} variant="outline" disabled={!exportClubId}>Download</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
