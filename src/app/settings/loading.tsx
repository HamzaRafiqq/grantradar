export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-64 mb-8" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-[12px] p-6 mb-6 space-y-4">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
        </div>
      ))}
    </div>
  )
}
