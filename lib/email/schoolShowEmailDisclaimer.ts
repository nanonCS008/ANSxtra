import { SCHOOL_SHOW_STAGE_CREW_EMAIL_DISCLAIMER } from '@/lib/schoolShowStageCrew'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HTML block for the Stage Crew “application received” email disclaimer. */
export function buildSchoolShowStageCrewDisclaimerHtml(): string {
  const lines = SCHOOL_SHOW_STAGE_CREW_EMAIL_DISCLAIMER.split('\n\n')
  const title = escapeHtml(lines[0] ?? 'Important Disclaimer')
  const body = escapeHtml(lines.slice(1).join('\n\n')).replace(/\n/g, '<br />')

  return `<p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1e293b;">${title}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#334155;">${body}</p>`
}
