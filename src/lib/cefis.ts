const BASE_AUTH = 'https://cefis.com.br'
const BASE_V3 = 'https://api-v3.cefis.com.br'

let cachedApiKey: string | null = null

export async function getCEFISApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey
  const res = await fetch(`${BASE_AUTH}/api/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.CEFIS_EMAIL,
      password: process.env.CEFIS_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`CEFIS login failed: ${res.status}`)
  const data = await res.json()
  cachedApiKey = data.api_key ?? data.token ?? data.key
  return cachedApiKey!
}

async function cefisAuthFetch(path: string, base = BASE_V3) {
  const apiKey = await getCEFISApiKey()
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`CEFIS API error ${res.status}: ${path}`)
  return res.json()
}

export async function cefisAuthFetchWithToken(path: string, token: string, base = BASE_V3) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`CEFIS API error ${res.status}: ${path}`)
  return res.json()
}

export async function loginCEFISUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_AUTH}/api/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`CEFIS login failed: ${res.status}`)
  const data = await res.json()
  const token = data.api_key ?? data.token ?? data.key
  if (!token) throw new Error('No token in CEFIS login response')
  return token
}

export async function getMeWithToken(token: string) {
  return cefisAuthFetchWithToken('/api/v1/user/me', token, BASE_AUTH)
}

export async function getTracksWithToken(token: string) {
  return cefisAuthFetchWithToken('/tracks', token)
}

export async function getMe() {
  return cefisAuthFetch('/api/v1/user/me', BASE_AUTH)
}

export async function getCourses(page = 1, limit = 50) {
  return cefisAuthFetch(`/courses?page=${page}&limit=${limit}`)
}

export async function getCourse(id: string) {
  return cefisAuthFetch(`/courses/${id}`)
}

export async function getCourseLessons(courseId: string) {
  return cefisAuthFetch(`/courses/${courseId}/lessons`)
}

export async function getTracks() {
  return cefisAuthFetch('/tracks')
}

export async function getTrack(id: string) {
  return cefisAuthFetch(`/tracks/${id}`)
}

export async function getCertificates() {
  return cefisAuthFetch('/performance/certificates')
}

export async function getLessons(courseId: string): Promise<any[]> {
  const data = await getCourseLessons(courseId)
  return data.lessons ?? data.data ?? data ?? []
}

export async function getAllCourses(): Promise<any[]> {
  const all: any[] = []
  let page = 1
  while (true) {
    const data = await getCourses(page, 50)
    const courses = data.courses ?? data.data ?? data
    if (!Array.isArray(courses) || courses.length === 0) break
    all.push(...courses)
    if (courses.length < 50) break
    page++
  }
  return all
}
