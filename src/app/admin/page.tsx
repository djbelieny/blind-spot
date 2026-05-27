'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostEvent {
  ts: number
  type: 'deepseek_chat' | 'openai_tts' | 'elevenlabs_tts'
  model: string
  endpoint: string
  sessionId?: string
  userId?: string
  inputTokens?: number
  outputTokens?: number
  characters?: number
  cost: number
}

interface StatsResponse {
  totalCostUSD: number
  last7DaysCostUSD: number
  todayCostUSD: number
  totalRequests: number
  byType: Record<string, { requests: number; cost: number }>
  byEndpoint: Record<string, { requests: number; cost: number }>
  dailySpend: Array<{ date: string; cost: number; requests: number }>
  recentEvents: CostEvent[]
}

interface UserPublic {
  id: string
  email: string
  name?: string
  createdAt: string
  cefisEmail?: string
  cefisName?: string
  cefisTrackIds?: string[]
  sessionIds: string[]
}

interface UsersResponse {
  users: UserPublic[]
  total: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usd(value: number): string {
  if (value === 0) return '$0.0000'
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(4)}`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function relativeTs(ts: number): string {
  return relativeTime(new Date(ts).toISOString())
}

function initials(user: UserPublic): string {
  const src = user.name || user.email
  return src.slice(0, 2).toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-1" style={{ background: '#141414', border: '1px solid #222' }}>
      <span style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', letterSpacing: '-0.01em' }}>
        {value}
      </span>
      {sub && <span style={{ color: '#555', fontSize: 12 }}>{sub}</span>}
    </div>
  )
}

function SpendChart({ days }: { days: StatsResponse['dailySpend'] }) {
  const maxCost = Math.max(...days.map((d) => d.cost), 0.0001)
  const width = 560
  const height = 120
  const barGap = 4
  const barW = Math.floor((width - barGap * (days.length - 1)) / days.length)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height + 24}`} width="100%" style={{ display: 'block', minWidth: 320 }}>
        {days.map((d, i) => {
          const barH = Math.max(2, (d.cost / maxCost) * height)
          const x = i * (barW + barGap)
          const y = height - barH
          const isToday = i === days.length - 1
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={isToday ? '#F94716' : '#2a2a2a'}
              />
              {/* label every ~4 days or first/last */}
              {(i === 0 || i === days.length - 1 || i % 4 === 0) && (
                <text
                  x={x + barW / 2}
                  y={height + 18}
                  textAnchor="middle"
                  fill="#555"
                  fontSize={9}
                >
                  {d.date.slice(5)}
                </text>
              )}
              <title>{`${d.date}: ${usd(d.cost)} (${d.requests} req)`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-secret': value },
    })
    if (res.ok) {
      onAuth(value)
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: 16,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 320,
        }}
      >
        <div>
          <h1 style={{ color: '#F94716', fontSize: 22, fontWeight: 700, margin: 0 }}>Admin</h1>
          <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Enter admin password to continue</p>
        </div>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            background: '#1a1a1a',
            border: `1px solid ${error ? '#F94716' : '#333'}`,
            borderRadius: 8,
            color: '#F0F0F5',
            padding: '10px 14px',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {error && <p style={{ color: '#F94716', fontSize: 12, margin: 0 }}>Wrong password</p>}
        <button
          type="submit"
          style={{
            background: '#F94716',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 0',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Unlock
        </button>
      </form>
    </div>
  )
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, users }: { stats: StatsResponse; users: UsersResponse | null }) {
  const endpointRows = Object.entries(stats.byEndpoint).sort((a, b) => b[1].cost - a[1].cost)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Total Spend" value={usd(stats.totalCostUSD)} sub="all time" />
        <StatCard label="Today" value={usd(stats.todayCostUSD)} sub="last 24h" />
        <StatCard label="Total Requests" value={stats.totalRequests.toLocaleString()} />
        <StatCard label="Active Users" value={users ? users.total : '—'} sub="registered" />
      </div>

      {/* Chart */}
      <div
        style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: 12,
          padding: '20px 20px 12px',
        }}
      >
        <h2 style={{ color: '#F0F0F5', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>
          Daily Spend — last 14 days
        </h2>
        <SpendChart days={stats.dailySpend} />
      </div>

      {/* Endpoint breakdown */}
      <div
        style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <h2 style={{ color: '#F0F0F5', fontSize: 14, fontWeight: 600, margin: 0 }}>
            By Endpoint
          </h2>
        </div>
        {endpointRows.length === 0 ? (
          <p style={{ color: '#555', fontSize: 13, padding: '20px', margin: 0 }}>No data yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a1a' }}>
                {['Endpoint', 'Requests', 'Total Cost', 'Avg / Request'].map((h) => (
                  <th
                    key={h}
                    style={{
                      color: '#888',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '10px 16px',
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {endpointRows.map(([endpoint, v], idx) => (
                <tr
                  key={endpoint}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : '#161616',
                    borderTop: '1px solid #1e1e1e',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: '#F0F0F5', fontSize: 13, fontFamily: 'monospace' }}>
                    {endpoint}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#ccc', fontSize: 13 }}>
                    {v.requests.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#F94716', fontSize: 13, fontWeight: 600 }}>
                    {usd(v.cost)}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#888', fontSize: 13 }}>
                    {usd(v.requests > 0 ? v.cost / v.requests : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Users ────────────────────────────────────────────────────────────────

function UsersTab({ users }: { users: UsersResponse | null }) {
  if (!users) {
    return <p style={{ color: '#555', fontSize: 13 }}>Loading users...</p>
  }

  if (users.total === 0) {
    return (
      <div
        style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#555', fontSize: 14, margin: 0 }}>No users registered yet</p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid #222',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: '#F0F0F5', fontSize: 14, fontWeight: 600, margin: 0 }}>Users</h2>
        <span
          style={{
            background: '#1e1e1e',
            color: '#888',
            fontSize: 12,
            padding: '2px 10px',
            borderRadius: 99,
          }}
        >
          {users.total} total
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a1a' }}>
              {['', 'Email', 'Name', 'Sessions', 'CEFIS', 'Created'].map((h) => (
                <th
                  key={h}
                  style={{
                    color: '#888',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '10px 14px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.users.map((u, idx) => (
              <tr
                key={u.id}
                style={{
                  background: idx % 2 === 0 ? 'transparent' : '#161616',
                  borderTop: '1px solid #1e1e1e',
                }}
              >
                {/* Avatar */}
                <td style={{ padding: '10px 14px' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#F94716',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {initials(u)}
                  </div>
                </td>
                <td style={{ padding: '10px 14px', color: '#F0F0F5', fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: '10px 14px', color: '#ccc', fontSize: 13 }}>{u.name || <span style={{ color: '#444' }}>—</span>}</td>
                <td style={{ padding: '10px 14px', color: '#ccc', fontSize: 13 }}>{u.sessionIds.length}</td>
                <td style={{ padding: '10px 14px' }}>
                  {u.cefisEmail ? (
                    <span
                      style={{
                        background: '#1a2e1a',
                        color: '#34C785',
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontWeight: 600,
                      }}
                    >
                      Connected
                    </span>
                  ) : (
                    <span style={{ color: '#444', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {relativeTime(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Costs ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  deepseek_chat: 'DeepSeek Chat',
  openai_tts: 'OpenAI TTS',
  elevenlabs_tts: 'ElevenLabs TTS',
}

function CostsTab({ stats }: { stats: StatsResponse }) {
  const typeEntries = Object.entries(stats.byType)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* By type cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {typeEntries.length === 0 ? (
          <p style={{ color: '#555', fontSize: 13 }}>No cost data yet</p>
        ) : (
          typeEntries.map(([type, v]) => (
            <div
              key={type}
              style={{
                background: '#141414',
                border: '1px solid #222',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {TYPE_LABELS[type] ?? type}
              </span>
              <span style={{ color: '#F94716', fontSize: 24, fontWeight: 700 }}>{usd(v.cost)}</span>
              <span style={{ color: '#555', fontSize: 12 }}>{v.requests.toLocaleString()} requests</span>
            </div>
          ))
        )}
      </div>

      {/* Recent events */}
      <div
        style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <h2 style={{ color: '#F0F0F5', fontSize: 14, fontWeight: 600, margin: 0 }}>
            Recent Events
          </h2>
        </div>
        {stats.recentEvents.length === 0 ? (
          <p style={{ color: '#555', fontSize: 13, padding: '20px', margin: 0 }}>No events yet</p>
        ) : (
          <div>
            {stats.recentEvents.map((e, i) => {
              const volume =
                e.type === 'deepseek_chat'
                  ? `${(e.inputTokens ?? 0).toLocaleString()} in / ${(e.outputTokens ?? 0).toLocaleString()} out tok`
                  : `${(e.characters ?? 0).toLocaleString()} chars`
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 20px',
                    borderTop: i > 0 ? '1px solid #1e1e1e' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: '#555', fontSize: 11, width: 72, flexShrink: 0 }}>
                    {relativeTs(e.ts)}
                  </span>
                  <span
                    style={{
                      background: '#1e1e1e',
                      color: '#ccc',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_LABELS[e.type] ?? e.type}
                  </span>
                  <span style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', flex: 1, minWidth: 120 }}>
                    {e.endpoint}
                  </span>
                  <span style={{ color: '#555', fontSize: 12 }}>{volume}</span>
                  <span style={{ color: '#F94716', fontSize: 13, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                    {usd(e.cost)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'costs'

function Dashboard({ password }: { password: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [users, setUsers] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const headers = { 'x-admin-secret': password }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
      ])
      if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status}`)
      if (!usersRes.ok) throw new Error(`Users: ${usersRes.status}`)
      setStats(await statsRes.json())
      setUsers(await usersRes.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  useEffect(() => { load() }, [load])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'costs', label: 'Costs' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#F0F0F5', fontFamily: 'Inter, DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#F94716', fontWeight: 700, fontSize: 16 }}>BlindSpot</span>
            <span style={{ color: '#333', fontSize: 14 }}>/</span>
            <span style={{ color: '#888', fontSize: 14 }}>Admin</span>
          </div>
          <button
            onClick={load}
            style={{
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: 7,
              color: '#888',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #1e1e1e', paddingBottom: 0 }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === id ? '2px solid #F94716' : '2px solid transparent',
                color: tab === id ? '#F0F0F5' : '#666',
                fontSize: 14,
                fontWeight: tab === id ? 600 : 400,
                padding: '8px 16px',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <span style={{ color: '#555', fontSize: 14 }}>Loading...</span>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#1a0a0a',
              border: '1px solid #3a1a1a',
              borderRadius: 10,
              padding: '16px 20px',
              color: '#F94716',
              fontSize: 13,
            }}
          >
            Error: {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {tab === 'overview' && <OverviewTab stats={stats} users={users} />}
            {tab === 'users' && <UsersTab users={users} />}
            {tab === 'costs' && <CostsTab stats={stats} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null)

  if (!password) return <PasswordGate onAuth={setPassword} />
  return <Dashboard password={password} />
}
