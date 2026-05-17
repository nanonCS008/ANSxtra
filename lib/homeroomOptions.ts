/** Homeroom tutor groups for application dropdowns (Y7–Y13). */
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export const HOMEROOM_OPTIONS: string[] = (() => {
  const options: string[] = []
  for (let year = 7; year <= 13; year++) {
    for (const section of SECTIONS) {
      options.push(`Y${year}${section}`)
    }
  }
  return options
})()
