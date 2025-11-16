import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80">
            <Image
              src="/beautybook-logo.png"
              alt="Beauty Book Logo"
              width={36}
              height={36}
            />
            <span className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Beauty Book
            </span>
          </Link>
          
          <nav className="flex space-x-6">
            <Link href="/providers" className="text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">
              Find Providers
            </Link>
            <Link href="/auth/sign-up" className="text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">
              Sign Up
            </Link>
            <Link href="/auth/sign-in" className="text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">
              Log In
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}