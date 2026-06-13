import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ShieldCheck, Clock, Activity, ArrowRight, Laptop } from 'lucide-react'

export const Landing: React.FC = () => {
  const { user, role } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // If user is already logged in, redirect them directly to their portal dashboard
    if (user && role) {
      navigate(`/${role}/dashboard`, { replace: true })
    }
  }, [user, role, navigate])

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between selection:bg-[#6366F1]/30">
      {/* Navbar header */}
      <header className="h-20 max-w-7xl mx-auto w-full px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-[#6366F1] flex items-center justify-center text-sm font-black shadow-lg shadow-[#6366F1]/20">L</span>
          <span className="text-xl font-bold text-white tracking-wide">LabEval Pro</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-350 hover:text-white transition px-4 py-2 hover:bg-slate-800/40 rounded-lg cursor-pointer"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-bold bg-[#6366F1] hover:bg-[#5053db] text-white px-4 py-2 rounded-lg transition shadow-lg shadow-[#6366F1]/10 hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full px-6 py-12 text-center space-y-12">
        <div className="space-y-6 max-w-3xl animate-fadeIn">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-full">
            <Activity className="w-3.5 h-3.5" />
            Empowering Modern Lab Classrooms
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Automated evaluation & <br />
            <span className="bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-emerald-400 bg-clip-text text-transparent">
              seamless record tracking
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Evaluate coding submissions, verify uploaded records, process resubmission requests, and monitor student academic performance in real-time.
          </p>
        </div>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full animate-scaleUp">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#6366F1] hover:bg-[#5053db] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 group shadow-xl shadow-[#6366F1]/15 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <span>Create Student/Teacher Account</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-bold rounded-xl transition flex items-center justify-center cursor-pointer active:scale-[0.98]"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Feature cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-10 text-left">
          {/* Card 1 */}
          <div className="bg-[#1E293B] border border-slate-800 p-6 rounded-2xl shadow hover:border-slate-700/80 transition duration-300">
            <div className="w-10 h-10 bg-[#6366F1]/10 text-[#6366F1] rounded-xl flex items-center justify-center mb-4">
              <Laptop className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Automated Code Uploads</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Students upload code files directly for assigned experiments, ensuring instant capture and teacher-side review logs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#1E293B] border border-slate-800 p-6 rounded-2xl shadow hover:border-slate-700/80 transition duration-300">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Verification & Revisions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify student lab record PDF/Word sheets individually or in bulk, with direct channels for grading revisions.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#1E293B] border border-slate-800 p-6 rounded-2xl shadow hover:border-slate-700/80 transition duration-300">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Real-time Notifications</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stay updated with instant alert bells when submissions are graded, resubmissions are approved, or revisions are completed.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-slate-850 max-w-7xl mx-auto w-full px-6 flex items-center justify-between text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} LabEval Pro. All rights reserved.</p>
        <p>Built with React, Tailwind & Supabase</p>
      </footer>
    </div>
  )
}

export default Landing
