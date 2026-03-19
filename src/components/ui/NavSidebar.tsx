'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Plan a dive',   icon: WaveIcon    },
  { href: '/dashboard/log',      label: 'Log a dive',    icon: LogIcon     },
  { href: '/dashboard/history',  label: 'Dive history',  icon: BookIcon    },
  { href: '/dashboard/analysis', label: 'Slack analysis',icon: ChartIcon   },
  { href: '/dashboard/community',label: 'Community',     icon: GroupIcon   },
  { href: '/dashboard/settings', label: 'Settings',      icon: SettingsIcon},
]

export default function NavSidebar({ user }: { user: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-tide-blue flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
              <path d="M2 7c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
              <path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">TideTracker</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-tide-blue-lt text-tide-blue-dk'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon active={active} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-100 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-900 truncate">{user.name ?? 'Diver'}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <SignOutIcon />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function WaveIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/><path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/></svg>
}
function LogIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/><path d="M11 13l9-9"/><path d="M15 3h6v6"/></svg>
}
function BookIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
}
function ChartIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function GroupIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a6bbd' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}
function SignOutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
