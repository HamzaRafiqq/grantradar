export default function PipelineLoading() {
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
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
            {/* Kanban columns */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(5)].map((_, col) => (
                <div key={col} className="flex-shrink-0 w-72">
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, card) => (
                      <div key={card} className="bg-white rounded-xl border border-gray-100 p-4 h-24 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
