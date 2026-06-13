import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4 text-purple-400">Lab Automation</h1>
      <p className="text-slate-300 mb-6">
        AI-Assisted Laboratory Practical Evaluation and Academic Monitoring System
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 transition rounded-lg font-medium shadow-lg"
      >
        Click count: {count}
      </button>
    </div>
  )
}

export default App
