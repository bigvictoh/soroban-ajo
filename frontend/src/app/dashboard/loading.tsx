// Issue #318: Bento grid skeleton loading state
export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="page-header-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="skeleton h-10 w-48 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded mt-3" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Bento grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[160px]">
          {/* Featured card — 2×2 */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 lg:row-span-2 skeleton rounded-2xl" />
          {/* 4 metric cards */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-1 row-span-1 skeleton rounded-2xl" />
          ))}
          {/* Quick actions */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 skeleton rounded-2xl" />
        </div>

        {/* Groups section skeleton */}
        <div className="space-y-4">
          <div className="skeleton h-7 w-36 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-52 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
