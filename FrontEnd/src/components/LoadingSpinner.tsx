import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 32, className = '' }) => {
  return (
    <div className={`flex items-center justify-center min-h-[150px] ${className}`}>
      <Loader2 style={{ width: size, height: size }} className="text-[#6366F1] animate-spin" />
    </div>
  )
}

export default LoadingSpinner
