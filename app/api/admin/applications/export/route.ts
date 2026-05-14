import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import clubs from '@/data/clubs.json';
import { formatApplicationResponsesForExport } from '@/lib/clubFormFields';

export const dynamic = 'force-dynamic';

type AppRow = {
  id: string;
  user_id: string;
  student_id: string | null;
  club_id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at: string | null;
  notes: string | null;
  year?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  prename?: string | null;
  responses?: unknown;
};

type StudentRowExpected = { student_id: string; year_group: number | null };
type StudentRowLegacy = { txtschoolcode: number; intncyear: number | null };

async function loadYearByStudentId(
  supabase: ReturnType<typeof getAdminClient>,
  studentIds: string[]
): Promise<Map<string, number | null>> {
  const empty = new Map<string, number | null>();
  if (studentIds.length === 0) return empty;

  const res1 = await supabase
    .from('students')
    .select('student_id,year_group')
    .in('student_id', studentIds);

  if (!res1.error) {
    const rows: StudentRowExpected[] = (res1.data as StudentRowExpected[] | null) ?? [];
    return new Map(rows.map((r) => [String(r.student_id), r.year_group]));
  }

  console.warn('CSV export: students table query (student_id) failed, trying legacy columns:', res1.error);

  // Legacy: txtschoolcode (numeric) + intncyear, matching join/profile routes.
  const codes = Array.from(
    new Set(
      studentIds
        .map((id) => parseInt(String(id).trim(), 10))
        .filter((n) => !Number.isNaN(n))
    )
  );
  if (codes.length === 0) return empty;

  const res2 = await supabase
    .from('students')
    .select('txtschoolcode,intncyear')
    .in('txtschoolcode', codes);

  if (res2.error) {
    console.error('Failed to fetch students (legacy) for CSV export:', res2.error);
    return empty;
  }

  return new Map(
    ((res2.data as StudentRowLegacy[]) ?? []).map((r) => [String(r.txtschoolcode), r.intncyear])
  );
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toTitleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function fileSafe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
}

function fullNameFromRow(row: AppRow): string {
  const parts = [row.first_name, row.last_name]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean);
  return parts.join(' ');
}

function yearSortKey(y: number | null): number {
  return y == null ? 999 : y;
}

async function getUserEmailMap(supabase: ReturnType<typeof getAdminClient>) {
  const emailByUserId = new Map<string, string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error('Failed to list users for CSV export:', error);
      break;
    }

    const users = data?.users ?? [];
    for (const user of users) {
      if (user.id && user.email) {
        emailByUserId.set(user.id, user.email);
      }
    }

    if (users.length < 1000) break;
    page += 1;
  }

  return emailByUserId;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const groupBy = request.nextUrl.searchParams.get('groupBy');
  const yearGroupValue = request.nextUrl.searchParams.get('yearGroup')?.trim();
  const clubId = request.nextUrl.searchParams.get('clubId')?.trim();
  const statusScope = request.nextUrl.searchParams.get('statusScope')?.trim() ?? 'enrolled';

  if (groupBy !== 'year' && groupBy !== 'club') {
    return NextResponse.json({ error: 'groupBy must be either year or club' }, { status: 400 });
  }

  if (statusScope !== 'enrolled' && statusScope !== 'pending' && statusScope !== 'all') {
    return NextResponse.json(
      { error: 'statusScope must be enrolled, pending, or all' },
      { status: 400 }
    );
  }

  const yearGroupAll = yearGroupValue?.toLowerCase() === 'all';
  const clubIdAll = clubId?.toLowerCase() === 'all';

  if (groupBy === 'year' && !yearGroupValue) {
    return NextResponse.json({ error: 'yearGroup is required for year export (use a number or all)' }, { status: 400 });
  }

  if (groupBy === 'club' && !clubId) {
    return NextResponse.json({ error: 'clubId is required for club export (use a club id or all)' }, { status: 400 });
  }

  const yearGroup = !yearGroupAll && yearGroupValue ? parseInt(yearGroupValue, 10) : null;
  if (groupBy === 'year' && !yearGroupAll && (yearGroup == null || Number.isNaN(yearGroup))) {
    return NextResponse.json({ error: 'Invalid yearGroup' }, { status: 400 });
  }

  const supabase = getAdminClient();

  let query = supabase
    .from('applications_v2')
    .select('id,user_id,student_id,club_id,status,applied_at,reviewed_at,notes,first_name,last_name,prename,year,responses')
    .order('applied_at', { ascending: true });

  if (statusScope === 'enrolled') {
    query = query.eq('status', 'approved');
  } else if (statusScope === 'pending') {
    query = query.eq('status', 'pending');
  }

  if (groupBy === 'club' && clubId && !clubIdAll) {
    query = query.eq('club_id', clubId);
  }

  const { data: appRows, error: appError } = await query;
  if (appError) {
    console.error('Failed to fetch applications for CSV export:', appError);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  const applications = (appRows ?? []) as AppRow[];

  const studentIds = Array.from(
    new Set(applications.map((row) => row.student_id).filter(Boolean) as string[])
  );
  const yearByStudentId = await loadYearByStudentId(supabase, studentIds);

  const emailByUserId = await getUserEmailMap(supabase);

  const getYearForFilter = (row: AppRow): number | null => {
    if (row.student_id) {
      const fromStudent = yearByStudentId.get(row.student_id);
      if (fromStudent != null) return fromStudent;
    }
    if (row.year != null) return row.year;
    return null;
  };

  const filtered = applications.filter((row) => {
    if (groupBy === 'year' && !yearGroupAll) {
      return getYearForFilter(row) === yearGroup;
    }
    return true;
  });

  const date = new Date().toISOString().slice(0, 10);
  const yearFilenamePart = yearGroupAll ? 'all' : String(yearGroup);

  let csvHeader: string[];
  let rows: unknown[][];

  if (groupBy === 'club') {
    const useClubColumn = clubIdAll;
    csvHeader = useClubColumn
      ? ['Club', 'Email', 'Full name', 'Nickname', 'Year group', 'Responses']
      : ['Email', 'Full name', 'Nickname', 'Year group', 'Responses'];

    const sorted = [...filtered].sort((a, b) => {
      const ya = getYearForFilter(a);
      const yb = getYearForFilter(b);
      const yCmp = yearSortKey(ya) - yearSortKey(yb);
      if (yCmp !== 0) return yCmp;
      return fullNameFromRow(a).localeCompare(fullNameFromRow(b), undefined, { sensitivity: 'base' });
    });

    rows = sorted.map((row) => {
      const clubName = clubs.find((club) => club.id === row.club_id)?.name ?? toTitleCase(row.club_id);
      const yearVal =
        row.student_id && yearByStudentId.has(row.student_id)
          ? yearByStudentId.get(row.student_id)
          : row.year != null
            ? row.year
            : null;
      const yearCell = yearVal == null ? '' : String(yearVal);

      const line = [
        emailByUserId.get(row.user_id) ?? '',
        fullNameFromRow(row),
        row.prename == null ? '' : String(row.prename).trim(),
        yearCell,
        formatApplicationResponsesForExport(row.responses, row.club_id),
      ];
      if (useClubColumn) line.unshift(clubName);
      return line;
    });
  } else {
    csvHeader = [
      'application_id',
      'user_id',
      'user_email',
      'year_group',
      'club_id',
      'club_name',
      'first_name',
      'last_name',
      'prename',
      'responses',
      'status',
      'applied_at',
      'reviewed_at',
      'notes',
    ];

    rows = filtered.map((row) => {
      const clubName = clubs.find((club) => club.id === row.club_id)?.name ?? toTitleCase(row.club_id);
      const yearVal =
        row.student_id && yearByStudentId.has(row.student_id)
          ? (yearByStudentId.get(row.student_id) ?? '')
          : row.year != null
            ? row.year
            : '';
      return [
        row.id,
        row.user_id,
        emailByUserId.get(row.user_id) ?? '',
        yearVal,
        row.club_id,
        clubName,
        row.first_name ?? '',
        row.last_name ?? '',
        row.prename ?? '',
        row.responses != null ? formatApplicationResponsesForExport(row.responses, row.club_id) : '',
        row.status,
        row.applied_at,
        row.reviewed_at ?? '',
        row.notes ?? '',
      ];
    });
  }

  const csvBody = [csvHeader, ...rows]
    .map((line) => line.map(csvEscape).join(','))
    .join('\n');
  const csv = `\ufeff${csvBody}`;

  let contentDisposition: string;
  if (groupBy === 'year') {
    const filename = `applications-year-${yearFilenamePart}-${statusScope}-${date}.csv`;
    contentDisposition = `attachment; filename="${filename}"`;
  } else if (clubIdAll) {
    const scopePart = statusScope === 'enrolled' ? '' : `-${statusScope}`;
    const filename = `all-clubs${scopePart}-${date}.csv`;
    contentDisposition = `attachment; filename="${filename}"`;
  } else {
    const clubMeta = clubs.find((c) => c.id === clubId);
    const displayName =
      clubMeta?.name && clubMeta.name.trim() ? clubMeta.name : toTitleCase(clubId!);
    const scopeSuffix = statusScope === 'enrolled' ? '' : `-${statusScope}`;
    const asciiFilename = `${fileSafe(displayName)}${scopeSuffix}-${date}.csv`;
    const utf8Filename =
      statusScope === 'enrolled'
        ? `${displayName} ${date}.csv`
        : `${displayName} (${statusScope}) ${date}.csv`;
    const star = encodeURIComponent(utf8Filename);
    contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${star}`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'no-store',
    },
  });
}
