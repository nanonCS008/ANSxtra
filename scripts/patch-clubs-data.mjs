/**
 * One-off patch: add Student Council + Enterprise Club, update Interact copy, etc.
 * Run: node scripts/patch-clubs-data.mjs
 */
import fs from 'fs'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
const clubsPath = path.join(root, 'data', 'clubs.json')

const raw = fs.readFileSync(clubsPath, 'utf8')
const clubs = JSON.parse(raw)
const withoutBlank = clubs.filter((c) => c.id !== 'blank')

const byId = new Map(withoutBlank.map((c) => [c.id, c]))

function patch(id, fn) {
  const c = byId.get(id)
  if (!c) throw new Error(`Missing club: ${id}`)
  fn(c)
}

patch('interact-club', (c) => {
  c.tagline = 'A Global Movement of Young Leaders'
  c.summary =
    'A global non-profit leadership club where students organize charity events, community projects, and create meaningful change.'
  c.description = `Interact is Rotary International's youth programme at ANS: student-led service and leadership with support from Rotary mentors and teachers. Members organise fundraisers, school initiatives, and community projects as part of a worldwide network across 145+ countries—alongside hundreds of thousands of young people building skills that last beyond school.`
  c.roles = [
    'Treasurer',
    'Secretary',
    'Coordinators',
    'Public Relations',
    'Fundraising / events',
    'Operators',
  ]
  c.applicationQuestionsRaw =
    'Name, Year, why they want to join the Interact Club, which roles (e.g. Treasurer, Secretary, Coordinators, Public Relations, Fundraising / events, Operators) would they like to join?'
})

const studentCouncil = {
  id: 'student-council',
  name: 'Student Council',
  tagline: 'Representing student voices and improving school life at ANS.',
  summary: 'Student voice, school events, and student-led projects at ANS.',
  description: `Student Council at ANS is the group that takes student concerns to staff. Year and house reps bring feedback from their year or house into meetings on Fridays at lunch in the boardroom.

Members help plan school events and fundraisers—booking, publicity, roles, and follow-through—not only the day of the event. The Council also meets with teachers and school leadership when something needs action at school level.`,
  meetingDay: 'Friday',
  meetingTime: 'Lunch break',
  location: 'Boardroom',
  yearGroup: 'Y7-13',
  yearGroupMin: 7,
  yearGroupMax: 13,
  leaders: [],
  teachers: [{ name: 'Mr Delaney', email: '' }],
  contact: '',
  specialConditions: null,
  questions: [],
  roles: [],
  accepting: false,
  image: '/clubs/PHOTOS/Student Council/page-hero.png',
  images: ['/clubs/PHOTOS/Student Council/card-main.png', '/clubs/PHOTOS/Student Council/page-hero.png'],
  applicationQuestionsRaw: null,
}

const enterpriseClub = {
  id: 'enterprise-club',
  name: 'Student Enterprise Club',
  displayName: 'Enterprise Club',
  tagline: 'Turn ideas into real businesses—build products, sell on campus, and donate profits to school-supported charities.',
  summary:
    'Turn ideas into reality through entrepreneurship, product creation, and real-world business experience.',
  description: `Turn ideas into real businesses. The Student Enterprise Club gives students in Years 7–13 the chance to build, launch, and sell real products on campus while learning how business works in the real world. Work in teams to create products, manage budgets, market your brand, and trade during weekly school breaks.

From pitching ideas to making sales, members gain hands-on experience in entrepreneurship, leadership, teamwork, and financial decision-making—all while supporting meaningful causes, as profits are donated to school-supported charities.

What you'll do:
• Build and pitch business ideas
• Design products and marketing campaigns
• Sell products during weekly trading sessions
• Manage budgeting, pricing, and profits
• Learn from guest entrepreneurs, parents, and alumni

Open to: Years 7–13
No prior business experience needed. Just creativity, commitment, and a willingness to learn.

This club is perfect for students interested in business, leadership, creativity, or making real impact.`,
  meetingDay: '',
  meetingTime: '',
  location: '',
  yearGroup: 'Y7-13',
  yearGroupMin: 7,
  yearGroupMax: 13,
  leaders: [
    {
      name: 'Prin',
      year: 'Y13',
      email: '79618@student.amnuaysilpa.ac.th',
      student_id: '79618',
    },
  ],
  teachers: [],
  contact: 'Message the student leader via school email or apply on ANSxtra.',
  specialConditions: null,
  questions: [],
  roles: [],
  accepting: true,
  image: '/clubs/PHOTOS/Enterprise Club/main-card.png',
  images: [
    '/clubs/PHOTOS/Enterprise Club/main-card.png',
    '/clubs/PHOTOS/Enterprise Club/gallery-1.png',
    '/clubs/PHOTOS/Enterprise Club/gallery-2.png',
  ],
  applicationQuestionsRaw: null,
  cardExtraTags: ['New club'],
}

byId.set('student-council', studentCouncil)
byId.set('enterprise-club', enterpriseClub)

const order = [
  'duke-of-edinburgh',
  'student-council',
  'school-show',
  'mun',
  'interact-club',
]

const orderedIds = new Set(order)
const allIds = [...new Set([...withoutBlank.map((c) => c.id), 'student-council', 'enterprise-club'])]
const restIds = allIds.filter((id) => !orderedIds.has(id)).sort()
const merged = [...order.map((id) => byId.get(id)).filter(Boolean), ...restIds.map((id) => byId.get(id)).filter(Boolean)]

const blank = clubs.find((c) => c.id === 'blank') ?? {
  id: 'blank',
  name: '',
  tagline: '',
  description: '',
  meetingDay: '',
  meetingTime: '',
  location: '',
  yearGroup: '',
  yearGroupMin: 7,
  yearGroupMax: 13,
  leaders: [],
  teachers: [],
  contact: '',
  specialConditions: null,
  applicationQuestionsRaw: null,
  questions: [],
  roles: [],
  accepting: false,
  image: '',
  images: [],
}

const out = [...merged, blank]
fs.writeFileSync(clubsPath, JSON.stringify(out), 'utf8')
console.log('Wrote', merged.length, 'clubs (+ blank). IDs:', merged.map((c) => c.id).join(', '))
