import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Search, Filter, AlertCircle, UserCheck, UserX, Shield, Award, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { logAudit } from '../../lib/dbUtils'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Profile {
  id: string
  full_name: string
  email?: string
  role: 'student' | 'teacher' | 'admin'
  department: string
  created_at: string
  is_active: boolean
}

export const UserManagement: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all')

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, department, created_at, is_active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (err: any) {
      console.error('Error fetching user profiles:', err)
      toast.error('Failed to load user accounts. Ensure you have run the database migration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [user])

  const handleRoleChange = async (profileId: string, newRole: 'student' | 'teacher' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId)

      if (error) throw error
      
      // Log audit event
      await logAudit(
        user.id,
        'update_user_role',
        'profiles',
        profileId,
        {
          target_user_id: profileId,
          new_role: newRole,
        }
      )
      
      toast.success('User role updated successfully!')
      fetchProfiles()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role')
      console.error(err)
    }
  }

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      // is_active might default to true. We toggle its state.
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId)

      if (error) throw error

      const statusMsg = currentStatus ? 'deactivated' : 'activated'
      
      // Log audit event
      await logAudit(
        user.id,
        currentStatus ? 'deactivate_user' : 'activate_user',
        'profiles',
        profileId,
        {
          target_user_id: profileId,
          new_status: !currentStatus,
        }
      )

      toast.success(`User successfully ${statusMsg}!`)
      fetchProfiles()
    } catch (err: any) {
      toast.error(err.message || 'Operation failed. Ensure migration is applied.')
      console.error(err)
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      p.full_name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.department?.toLowerCase().includes(searchLower)

    const matchesRole = roleFilter === 'all' || p.role === roleFilter

    return matchesSearch && matchesRole
  })

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">User Account Management</h2>
        <p className="text-slate-400 text-sm">Review registered accounts, modify permission levels, and activate/deactivate user access.</p>
      </div>

      {/* Advanced Filters */}
      <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#6366F1]" />
          <span>Filter & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
            />
          </div>

          {/* Role selector dropdown */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {filteredProfiles.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Registered At</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredProfiles.map((profile) => {
                  const registeredDateFormatted = new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  // Safe default for is_active in case db column is null
                  const isActive = profile.is_active !== false

                  return (
                    <tr key={profile.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {profile.full_name || 'No Name Provided'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {profile.email || 'No email synced'}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4 text-slate-300 font-medium uppercase">
                        {profile.department || 'N/A'}
                      </td>

                      {/* Registered Date */}
                      <td className="px-6 py-4 text-slate-400">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{registeredDateFormatted}</span>
                        </div>
                      </td>

                      {/* Security Role Change Dropdown */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {profile.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Award className="w-4 h-4 text-slate-500" />
                          )}
                          
                          {/* Only allow changing role if user is NOT editing their own account */}
                          {profile.id === user.id ? (
                            <span className="text-xs font-bold text-indigo-400 capitalize">
                              {profile.role} (You)
                            </span>
                          ) : (
                            <select
                              value={profile.role}
                              onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                              className="bg-[#0F172A] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-transparent cursor-pointer font-semibold capitalize"
                            >
                              <option value="student">student</option>
                              <option value="teacher">teacher</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action buttons (Deactivate/Activate) */}
                      <td className="px-6 py-4 text-right">
                        {profile.id === user.id ? (
                          <span className="text-xs text-slate-500 italic pr-2">Protected</span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(profile.id, isActive)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              isActive
                                ? 'bg-rose-550/10 hover:bg-rose-600 border-rose-500/20 text-rose-450 hover:text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 border-transparent text-white'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              <AlertCircle className="w-12 h-12 text-slate-650 mx-auto mb-4" />
              No registered user profiles found matching current criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagement
