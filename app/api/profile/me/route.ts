import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = session.user.email.trim().toLowerCase();
  const at = email.indexOf('@');
  const studentId = at > 0 ? email.slice(0, at) : '';
  const domain = at > 0 ? email.slice(at + 1) : '';

  if (!studentId || domain !== 'student.amnuaysilpa.ac.th') {
    return NextResponse.json(
      { error: 'Account is not recognized as a valid student.' },
      { status: 403 }
    );
  }

  // Support both schemas:
  // - expected: students(student_id text, year_group int)
  // - legacy:   students(txtschoolcode int, intncyear int)
  let data: { year_group?: number | null; intncyear?: number | null } | null = null;
  let error: any = null;

  // Try expected schema first.
  {
    const res = await supabaseAdmin
      .from('students')
      .select('year_group')
      .eq('student_id', studentId)
      .maybeSingle();
    data = res.data as any;
    error = res.error;
  }

  // Fallback to legacy schema when columns don't exist.
  if (error?.code === '42703') {
    const code = parseInt(studentId, 10);
    if (!Number.isNaN(code)) {
      const res = await supabaseAdmin
        .from('students')
        .select('intncyear')
        .eq('txtschoolcode', code)
        .maybeSingle();
      data = res.data as any;
      error = res.error;
    }
  }

  if (error) {
    console.error('Student lookup error:', error);
    return NextResponse.json({ error: 'Failed to verify student account' }, { status: 500 });
  }

  const yearGroup = (data as any)?.year_group ?? (data as any)?.intncyear ?? null;

  if (!yearGroup) {
    return NextResponse.json(
      { error: 'Account is not recognized as a valid student.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ year_group: yearGroup });
}
