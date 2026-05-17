import { SCHOOL_SHOW_STAGE_CREW_NOTICE_SECTIONS } from '@/lib/schoolShowStageCrew'
import { cn } from '@/lib/utils/cn'

type SchoolShowStageCrewNoticeProps = {
  className?: string
  /** Slightly tighter padding on the apply form */
  compact?: boolean
}

export function SchoolShowStageCrewNotice({ className, compact }: SchoolShowStageCrewNoticeProps) {
  return (
    <aside
      className={cn(
        'rounded-xl border border-amber-400/35 bg-amber-500/[0.08]',
        compact ? 'px-4 py-3.5' : 'px-4 py-4 md:px-5 md:py-4',
        className
      )}
      role="note"
      aria-label="School Show Stage Crew special notice"
    >
      <p className="text-amber-200 font-semibold text-sm mb-3">Special Notice</p>

      <div className="space-y-4">
        {SCHOOL_SHOW_STAGE_CREW_NOTICE_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={cn(
              sectionIndex > 0 && 'pt-4 border-t border-amber-400/20'
            )}
          >
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90 mb-2">
              {section.title}
            </h4>
            <ul className="space-y-2 list-none pl-0 m-0">
              {section.items.map((item) => (
                <li key={`${section.title}-${item.label ?? item.text}`} className="flex gap-2.5 items-start text-sm leading-relaxed">
                  <span
                    className="mt-[0.45rem] shrink-0 w-1.5 h-1.5 rounded-full bg-amber-300/70"
                    aria-hidden
                  />
                  <span className="text-white/80">
                    {item.label ? (
                      <>
                        <span className="font-medium text-white/95">{item.label}:</span>{' '}
                        {item.text}
                      </>
                    ) : (
                      item.text
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
