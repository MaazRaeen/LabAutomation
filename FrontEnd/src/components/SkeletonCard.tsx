import React from 'react'

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-[#1E293B] border border-slate-850 rounded-xl p-5 shadow space-y-4 animate-pulse">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-700 rounded"></div>
        <div className="h-4 w-12 bg-slate-700 rounded"></div>
      </div>
      {/* Title */}
      <div className="h-6 w-3/4 bg-slate-700 rounded"></div>
      {/* Description lines */}
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-slate-700 rounded"></div>
        <div className="h-3.5 w-5/6 bg-slate-700 rounded"></div>
      </div>
      {/* Footer statistics */}
      <div className="pt-4 border-t border-slate-800 flex justify-between gap-4">
        <div className="h-3 w-1/3 bg-slate-700 rounded"></div>
        <div className="h-3 w-1/4 bg-slate-700 rounded"></div>
      </div>
    </div>
  )
}

export default SkeletonCard
