import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Bell, CheckSquare, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

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

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      if (data) {
        setNotifications(data)
        // Recalculate unread count
        const countRes = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        setUnreadCount(countRes.count || 0)
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
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
        () => {
          fetchNotifications()
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

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return
    setMarkingRead(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      toast.success('All notifications marked as read!')
      fetchNotifications()
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
      console.error(err)
    } finally {
      setMarkingRead(false)
    }
  }

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1E293B] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-scaleUp">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Alerts & Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingRead}
                className="text-[10px] text-[#6366F1] hover:text-[#5053db] font-bold hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
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
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 text-[#6366F1] animate-spin" />
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
                    className={`px-4 py-3 text-xs leading-normal transition ${
                      n.is_read ? 'bg-transparent text-slate-400' : 'bg-[#6366F1]/5 text-slate-200 font-medium'
                    }`}
                  >
                    <p>{n.message}</p>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                      <span>{dateStr}</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-650 mb-2" />
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
