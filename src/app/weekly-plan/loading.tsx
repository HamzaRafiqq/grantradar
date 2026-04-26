export default function WeeklyPlanLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-72 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Progress bar skeleton */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-8 bg-gray-100 rounded" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full" />
      </div>

      {/* Section skeleton — Urgent */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-red-100 rounded-full" />
          <div className="h-4 w-36 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Section skeleton — Important */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-amber-100 rounded-full" />
          <div className="h-4 w-44 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Section skeleton — Social */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-purple-100 rounded-full" />
          <div className="h-4 w-52 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* AI recommendation skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-green-100 rounded-full" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        <div className="bg-gray-200 rounded-[12px] h-20" />
      </div>

      {/* Metrics skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded-full" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-transparent"
            >
              <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskSkeleton() {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-start gap-4">
      <div className="w-5 h-5 rounded border-2 border-gray-200 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="h-3 w-full bg-gray-100 rounded mb-1" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
