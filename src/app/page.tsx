import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
      <main className="container mx-auto px-4">
        <section className="min-h-screen flex flex-col items-center justify-center py-8 sm:py-12">
          <div className="max-w-3xl mx-auto text-center -mt-16 sm:-mt-20">
            <Image
              src="/beautybook-logo.png"
              alt="BeautyBook logo"
              width={200}
              height={200}
              className="w-40 sm:w-48 md:w-52 h-auto mx-auto mb-8 sm:mb-10"
              priority
            />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Welcome to Beauty Book
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-300 mb-8">
              Discover and book appointments with top beauty providers in your area
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-up" className="bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-lg font-medium border border-blue-600 dark:border-blue-500 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800">
                Sign Up
              </Link>
              <Link href="/auth/sign-in" prefetch={false} className="bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800">
                Log In
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}