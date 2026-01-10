'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Plug,
  BarChart3,
  Calendar,
  GitCompare,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Image,
  ArrowLeftRight,
  DollarSign,
  Cloud,
  Link2,
  Hash,
  MessageSquare,
  AtSign,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

const navItems: NavItem[] = [
  {
    title: 'BI Insights',
    href: '/admin/insights',
    icon: BarChart3,
    children: [
      { title: 'Overview', href: '/admin/insights', icon: BarChart3 },
      { title: 'Content Hub', href: '/admin/insights/content', icon: Image },
      { title: 'Compare Posts', href: '/admin/insights/content/compare', icon: ArrowLeftRight },
      { title: 'AI Analysis', href: '/admin/insights/ai', icon: Sparkles },
      { title: 'FB vs IG', href: '/admin/insights/comparison', icon: GitCompare },
      { title: 'Calendar', href: '/admin/insights/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Advanced Analytics',
    href: '/admin/insights/ads',
    icon: TrendingUp,
    children: [
      { title: 'Ad Performance', href: '/admin/insights/ads', icon: DollarSign },
      { title: 'Attribution', href: '/admin/insights/attribution', icon: Link2 },
      { title: 'Correlations', href: '/admin/insights/correlations', icon: TrendingUp },
      { title: 'Weather Impact', href: '/admin/insights/weather', icon: Cloud },
    ],
  },
  {
    title: 'Social Listening',
    href: '/admin/insights/sentiment',
    icon: MessageSquare,
    children: [
      { title: 'Sentiment', href: '/admin/insights/sentiment', icon: MessageSquare },
      { title: 'Hashtags', href: '/admin/insights/hashtags', icon: Hash },
      { title: 'Mentions', href: '/admin/insights/mentions', icon: AtSign },
    ],
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    children: [
      { title: 'Connections', href: '/admin/settings/connections', icon: Plug },
      { title: 'Users', href: '/admin/users', icon: Users },
    ],
  },
]

// Build version for deployment verification
const BUILD_VERSION = '2026-01-09T23:00:00+01:00'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand sections based on current path
    const expanded: string[] = []

    const biInsightsPages = [
      '/admin/insights',
      '/admin/insights/content',
      '/admin/insights/ai',
      '/admin/insights/comparison',
      '/admin/insights/calendar',
    ]
    const advancedPages = [
      '/admin/insights/ads',
      '/admin/insights/attribution',
      '/admin/insights/correlations',
      '/admin/insights/weather',
    ]
    const socialPages = [
      '/admin/insights/sentiment',
      '/admin/insights/hashtags',
      '/admin/insights/mentions',
    ]

    if (biInsightsPages.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      expanded.push('BI Insights')
    }
    if (advancedPages.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      expanded.push('Advanced Analytics')
    }
    if (socialPages.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      expanded.push('Social Listening')
    }
    if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/users')) {
      expanded.push('Settings')
    }

    // Default to BI Insights expanded if nothing else
    if (expanded.length === 0) {
      expanded.push('BI Insights')
    }
    return expanded
  })

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/admin/insights" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#aa7712] text-white font-bold text-sm">
                IF
              </div>
              <span className="text-lg font-bold">Iconic Festival</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isExpanded = expandedItems.includes(item.title)
              const hasChildren = item.children && item.children.length > 0

              if (hasChildren) {
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {item.title}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && item.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          const isChildActive = pathname === child.href
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                isChildActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.title}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          <Separator />

          {/* User menu */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                  <Avatar className="h-8 w-8 bg-[#aa7712]">
                    <AvatarFallback className="bg-[#aa7712] text-white">IF</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">Iconic Festival</span>
                    <span className="text-xs text-gray-500">admin@iconicfestival.nl</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Build version indicator */}
          <div className="px-4 pb-3 text-[10px] text-gray-400 font-mono">
            v{BUILD_VERSION.slice(0, 16).replace('T', ' ')}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6 dark:bg-gray-800 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="text-lg font-bold">Iconic Festival</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
