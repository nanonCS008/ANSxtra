/** Session-backed page: avoid static prerender edge cases in CI. */
export const dynamic = 'force-dynamic'

export default function ProfileSetupLayout({ children }: { children: React.ReactNode }) {
  return children
}
