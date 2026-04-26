export default function DocumentsLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col p-4 gap-2 flex-shrink-0">
          <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            {/* Trust score bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 h-20 animate-pulse" />
            {/* Document grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-36 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
