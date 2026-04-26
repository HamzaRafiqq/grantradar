export default function FunderGrantsLoading() {
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
              <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-12 bg-gray-50 border-b border-gray-100 animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 border-b border-gray-50 px-5 flex items-center gap-4">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
