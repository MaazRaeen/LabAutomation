import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Search, Filter, AlertCircle, UserCheck, UserX, Shield, Award, Calendar, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
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
      // Fetch from backend — uses service role key so admin can see all users
      const data = await apiGet('/api/admin/users')
      setProfiles(data.users || [])
    } catch (err: any) {
      console.error('Error fetching user profiles:', err)
      toast.error('Failed to load user accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [user])

  const handleRoleChange = async (profileId: string, newRole: 'student' | 'teacher' | 'admin') => {
    try {
      // PUT /api/admin/users/:userId/role — backend handles audit log
      await apiPut(`/api/admin/users/${profileId}/role`, { role: newRole })
      toast.success('User role updated successfully!')
      fetchProfiles()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role')
      console.error(err)
    }
  }

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      // Update active status via Supabase (profile field toggle)
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId)

      if (error) throw error

      const statusMsg = currentStatus ? 'deactivated' : 'activated'
      toast.success(`User successfully ${statusMsg}!`)
      fetchProfiles()
    } catch (err: any) {
      toast.error(err.message || 'Operation failed. Ensure migration is applied.')
      console.error(err)
    }
  }

  const handleDeleteUser = async (profileId: string, fullName: string, role: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to permanently delete the ${role} account for "${fullName}"?\n\nThis action CANNOT be undone and will delete all their records (submissions, grades, etc.) from the database.`
    )
    if (!isConfirmed) return

    try {
      // DELETE /api/admin/users/:id — backend handles cascading deletion + audit log
      await apiDelete(`/api/admin/users/${profileId}`)
      toast.success('User account and all associated records deleted permanently!')
      fetchProfiles()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user account')
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
        <h2 className="text-3xl font-black text-[#111827] mb-1">User Account Management</h2>
        <p className="text-[#6B7280] text-sm">Review registered accounts, modify permission levels, and activate/deactivate user access.</p>
      </div>

      {/* Advanced Filters */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-[#6B7280] text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#4F46E5]" />
          <span>Filter & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
            />
          </div>

          {/* Role selector dropdown */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition cursor-pointer font-semibold"
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
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredProfiles.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase bg-[#F8FAFC]">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Registered At</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/60 text-sm">
                {filteredProfiles.map((profile) => {
                  const registeredDateFormatted = new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  // Safe default for is_active in case db column is null
                  const isActive = profile.is_active !== false

                  return (
                    <tr key={profile.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#111827]">
                          {profile.full_name || 'No Name Provided'}
                        </div>
                        <div className="text-xs text-[#6B7280] font-semibold">
                          {profile.email || 'No email synced'}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4 text-[#111827] font-bold uppercase">
                        {profile.department || 'N/A'}
                      </td>

                      {/* Registered Date */}
                      <td className="px-6 py-4 text-[#6B7280]">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>{registeredDateFormatted}</span>
                        </div>
                      </td>

                      {/* Security Role Change Dropdown */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {profile.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-[#4F46E5]" />
                          ) : (
                            <Award className="w-4 h-4 text-[#6B7280]" />
                          )}
                          
                          {/* Only allow changing role if user is NOT editing their own account */}
                          {profile.id === user.id ? (
                            <span className="text-xs font-bold text-[#4F46E5] capitalize">
                              {profile.role} (You)
                            </span>
                          ) : (
                            <select
                              value={profile.role}
                              onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                              className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-transparent cursor-pointer font-bold capitalize"
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#10B981] border border-[#D1FAE5] uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#EF4444] border border-[#FEE2E2] uppercase">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action buttons (Deactivate/Activate & Delete) */}
                      <td className="px-6 py-4 text-right">
                        {profile.id === user.id ? (
                          <span className="text-xs text-[#6B7280] italic pr-2 font-semibold">Protected</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(profile.id, isActive)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                isActive
                                  ? 'bg-[#FEE2E2] hover:bg-[#EF4444] border-transparent text-[#EF4444] hover:text-white'
                                  : 'bg-[#10B981] hover:bg-[#059669] border-transparent text-white'
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
                            <button
                              onClick={() => handleDeleteUser(profile.id, profile.full_name, profile.role)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border border-[#E5E7EB] bg-[#F8FAFC] text-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:border-transparent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center text-[#6B7280] text-sm">
              <AlertCircle className="w-12 h-12 text-slate-305 mx-auto mb-4" />
              No registered user profiles found matching current criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagement
