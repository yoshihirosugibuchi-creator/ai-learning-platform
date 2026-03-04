import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-6 text-6xl">📡</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          オフラインです
        </h1>
        <p className="mb-8 text-gray-600">
          インターネット接続を確認してください
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          再試行
        </Link>
      </div>
    </div>
  )
}
