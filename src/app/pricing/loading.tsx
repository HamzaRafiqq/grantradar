import Navbar from '@/components/ui/Navbar'

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 animate-pulse">
        <div className="text-center mb-12">
          <div className="h-10 bg-gray-200 rounded-lg w-64 mx-auto mb-4" />
          <div className="h-5 bg-gray-100 rounded w-80 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-24" />
              <div className="h-10 bg-gray-200 rounded w-32" />
              <div className="space-y-3 pt-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded" />
                ))}
              </div>
              <div className="h-12 bg-gray-200 rounded-xl mt-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
