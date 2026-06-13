import React from 'react'

interface PlaceholderViewProps {
  title: string
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-8 text-center max-w-2xl mx-auto shadow-xl my-8">
      <h2 className="text-2xl font-bold text-[#6366F1] mb-2">{title}</h2>
      <p className="text-slate-400 text-sm">
        The {title.toLowerCase()} dashboard view is currently under development.
      </p>
    </div>
  )
}

export default PlaceholderView
