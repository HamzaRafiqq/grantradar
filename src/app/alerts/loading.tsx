export default function AlertsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-64 mb-8" />
      {/* Deadline rows skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-[12px] p-5 mb-3 flex items-center gap-4">
          <div className="w-16 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="w-24 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
