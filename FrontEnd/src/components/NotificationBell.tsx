import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Bell, CheckSquare, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiGet, apiPatch } from '../lib/api'

interface Notification {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  
  // Ref to store current isOpen state to avoid stale closure in realtime listener
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const fetchNotifications = async (showLoading = true) => {
    if (!user) return
    if (showLoading) setLoading(true)
    try {
      const res = await apiGet('/api/notifications')
      if (res) {
        setNotifications(res.notifications || [])
        setUnreadCount(res.unread_count || 0)
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    // Real-time subscription to user's notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          if (isOpenRef.current) {
            // If panel is open, mark new notifications as viewed immediately in the background
            try {
              await apiPatch('/api/notifications/viewed')
            } catch (err) {
              console.error('Failed to update viewed status on new message:', err)
            }
          }
          fetchNotifications(false)
        }
      )
      .subscribe()

    // Handle clicks outside the dropdown to close it
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user])

  const handleToggleOpen = async () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (nextOpen && user) {
      // Instantly set unread count to 0 for responsive UI response
      setUnreadCount(0)
      try {
        await apiPatch('/api/notifications/viewed')
        fetchNotifications(false)
      } catch (err) {
        console.error('Error marking notifications as viewed:', err)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    setMarkingRead(true)
    try {
      await apiPatch('/api/notifications/read', { notification_ids: [] })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read!')
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
      console.error(err)
    } finally {
      setMarkingRead(false)
    }
  }

  const handleMarkSingleRead = async (id: string, isRead: boolean) => {
    if (isRead) return
    try {
      // Optimistic local state update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      await apiPatch(`/api/notifications/${id}/read`)
    } catch (err: any) {
      console.error('Error marking notification as read:', err)
      // Rollback on error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
    }
  }

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggleOpen}
        className="relative p-2 text-[#6B7280] hover:text-[#4F46E5] rounded-lg hover:bg-[#EEF2FF] transition cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl shadow-xl overflow-hidden z-50 animate-scaleUp">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">Alerts & Notifications</span>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingRead}
                className="text-[10px] text-[#4F46E5] hover:text-[#4338CA] font-bold hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {markingRead ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckSquare className="w-3 h-3" />
                )}
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-64 overflow-y-auto divide-y divide-[#E5E7EB]/60">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((n) => {
                const timeStr = new Date(n.created_at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const dateStr = new Date(n.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkSingleRead(n.id, n.is_read)}
                    className={`px-4 py-3 text-xs leading-normal transition cursor-pointer select-none ${
                      n.is_read ? 'bg-transparent text-[#6B7280]' : 'bg-[#EEF2FF]/40 text-[#111827] font-semibold hover:bg-[#EEF2FF]/20'
                    } hover:bg-[#F3F4F6]`}
                  >
                    <p>{n.message}</p>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-[#6B7280] font-semibold">
                      <span>{dateStr}</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-xs">No notifications found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

