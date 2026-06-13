import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error boundary catch:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-scaleUp">
            <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white">Something went wrong</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              An unexpected application crash occurred. If this persists, please contact support.
            </p>
            <div className="bg-[#0F172A] border border-slate-850 p-4 rounded-lg text-left text-xs font-mono overflow-auto max-h-40 text-rose-400 leading-normal">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-[#6366F1] hover:bg-[#5053db] text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Return to Safety</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
