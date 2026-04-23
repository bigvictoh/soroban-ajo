'use client'

/**
 * AppLayout
 *
 * Root layout shell. On desktop (lg+) renders the FloatingSidebar and
 * offsets the main content area. On mobile renders MobileNav (FAB +
 * slide-up drawer + bottom quick-nav bar).
 *
 * Skip links are preserved for keyboard / screen-reader users.
 */

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FloatingSidebar } from './FloatingSidebar'
import { MobileNav } from './MobileNav'
import { NotificationHistory } from './NotificationHistory'
import Onboarding from './Onboarding'
import { ProductTour } from './tour/ProductTour'
import { ThemeToggle } from './ThemeToggle'
import { useOnboarding } from '@/hooks/useOnboarding'
import { GlobalSearch } from './GlobalSearch'
import { LiveRegion } from './LiveRegion'

interface AppLayoutProps {
  children: React.ReactNode
}

/** Shared nav item definitions */
const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    dataTour: 'dashboard',
  },
  {
    href: '/groups',
    label: 'Groups',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    dataTour: 'groups-list',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    dataTour: 'profile',
  },
  {
    href: '/help',
    label: 'Help',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname()
  const { hasCompletedOnboarding, startOnboarding } = useOnboarding()

  useEffect(() => {
    if (!hasCompletedOnboarding && pathname === '/') {
      const timer = setTimeout(startOnboarding, 1000)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedOnboarding, pathname, startOnboarding])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-300">
      {/* Skip Links */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <a
        href="#floating-sidebar"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-48 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to navigation
      </a>

      {/* Header */}
      <header className="bg-white dark:bg-dark-bg-secondary shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-indigo-400">
                🪙 Ajo
              </h1>
              <span className="hidden sm:inline text-gray-600 dark:text-slate-400 text-sm">
                Decentralized Savings
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden md:block mr-2">
                <GlobalSearch />
              </div>
              <ThemeToggle />
              <NotificationBell />
              <NotificationHistory />
              <div data-tour="wallet-connect">
                <WalletConnector />
              </div>
            </div>

          {/* Navigation */}
          <nav
            id="navigation"
            className="flex gap-1 -mb-px overflow-x-auto"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-tour={link.dataTour}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={link.label}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 dark:border-indigo-400 text-blue-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={link.icon}
                    />
                  </svg>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      {/* Onboarding & Tour */}
      <Onboarding />
      <ProductTour 
        initialSteps={[
          {
            id: 'wallet',
            target: '[data-tour="wallet-connect"]',
            title: 'Digital Wallet',
            content: 'Connect your Stellar wallet to start participating in savings groups securely.',
            position: 'bottom'
          },
          {
            id: 'dashboard',
            target: '[data-tour="dashboard"]',
            title: 'Financial Overview',
            content: 'Track your contributions, earnings, and active groups in one place.',
            position: 'bottom'
          },
          {
            id: 'groups',
            target: '[data-tour="groups-list"]',
            title: 'Explore Groups',
            content: 'Find savings groups that match your financial goals and risk profile.',
            position: 'bottom'
          },
          {
            id: 'profile',
            target: '[data-tour="profile"]',
            title: 'Your Account',
            content: 'Manage your personal settings, security preferences, and view your history.',
            position: 'bottom'
          }
        ]}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-bg-secondary border-t border-gray-200 dark:border-dark-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Ajo</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                Decentralized savings groups powered by Stellar blockchain.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/docs"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/community"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    Community
                  </Link>
                </li>
                <li>
                  <a
                    href="https://stellar.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Stellar Network (opens in new tab)"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    Stellar Network
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Connect</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub (opens in new tab)"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter (opens in new tab)"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Discord (opens in new tab)"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>
          </div>
        </footer>
      </div>
      <LiveRegion />
    
  )
}
