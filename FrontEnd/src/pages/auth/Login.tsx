import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  
  const { setUser, setRole, setSession } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data?.user) {
        // Fetch user profile from database to get their role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          throw new Error('Could not fetch user profile details.')
        }

        // Set auth details in Zustand store
        setUser(data.user)
        setRole(profile.role)
        setSession(data.session)

        toast.success(`Welcome, ${profile.full_name || 'User'}!`)

        // Redirect based on role
        if (profile.role === 'student') {
          navigate('/student/dashboard')
        } else if (profile.role === 'teacher') {
          navigate('/teacher/dashboard')
        } else if (profile.role === 'admin') {
          navigate('/admin/dashboard')
        } else {
          navigate('/')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">LabEval Pro</h2>
          <p className="text-slate-400 text-sm">Sign in to monitor and evaluate lab practicals</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-[#6366F1]/50 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition flex justify-center items-center text-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#6366F1] hover:underline font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
