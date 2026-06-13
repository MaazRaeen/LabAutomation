import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { User, Mail, Lock, GraduationCap, Hash, Building, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student')
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !email || !password || !department || (role === 'student' && !enrollmentNo)) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // 1. Sign up user in Supabase Auth (passes metadata that trigger reads)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            department,
            enrollment_no: role === 'student' ? enrollmentNo : null,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data?.user) {
        // 2. Perform direct upsert to public.profiles table as requested by instructions.
        // We wrap it in a try-catch to tolerate RLS warnings if database has email verification enabled.
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              role,
              department,
              enrollment_no: role === 'student' ? enrollmentNo : null,
            })
          if (profileError) {
            console.warn('Profile upsert via client failed, relying on trigger:', profileError)
          }
        } catch (upsertErr) {
          console.warn('Upsert exception, relying on database trigger:', upsertErr)
        }

        toast.success('Registration successful! Please sign in.')
        navigate('/login')
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h2>
          <p className="text-slate-400 text-sm">Register to join LabEval Pro</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">
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
                className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="password">
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
                className="w-full pl-10 pr-10 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="role">
                I am a
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'student' | 'teacher' | 'admin')}
                  className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white text-sm transition appearance-none cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="department">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="h-5 w-5" />
                </div>
                <input
                  id="department"
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="CSE"
                  className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
                />
              </div>
            </div>
          </div>

          {role === 'student' && (
            <div className="animate-fadeIn">
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="enrollmentNo">
                Enrollment Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="h-5 w-5" />
                </div>
                <input
                  id="enrollmentNo"
                  type="text"
                  required={role === 'student'}
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="e.g. 0101CS211050"
                  className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white placeholder-slate-500 text-sm transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-[#6366F1]/50 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition flex justify-center items-center text-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-[#6366F1] hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
