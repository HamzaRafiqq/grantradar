export default function FunderDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <div className="flex h-screen">
        {/* Funder sidebar */}
        <div className="hidden md:flex w-56 bg-[#0F2B4C] flex-col p-4 gap-2 flex-shrink-0">
          <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
            {/* Two-col grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 h-72 animate-pulse" />
              <div className="bg-white rounded-2xl border border-gray-100 h-72 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
