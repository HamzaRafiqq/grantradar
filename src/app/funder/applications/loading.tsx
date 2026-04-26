export default function FunderApplicationsLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <div className="flex h-screen">
        <div className="hidden md:flex w-56 bg-[#0F2B4C] flex-col p-4 gap-2 flex-shrink-0">
          <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-7 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            {/* Filter bar */}
            <div className="flex gap-3 mb-5">
              <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-12 bg-gray-50 border-b border-gray-100 animate-pulse" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 border-b border-gray-50 px-5 flex items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse hidden sm:block" />
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
