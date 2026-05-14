import { JoinSubmission } from './types/club'

const STORAGE_KEY = 'ansxtra_submissions'

export function saveSubmission(submission: JoinSubmission): void {
  if (typeof window === 'undefined') return
  
  const existing = getSubmissions()
  existing.push(submission)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getSubmissions(): JoinSubmission[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function hasSubmittedToClub(clubId: string, studentId: string): boolean {
  const submissions = getSubmissions()
  return submissions.some(s => s.clubId === clubId && s.studentId === studentId)
}

