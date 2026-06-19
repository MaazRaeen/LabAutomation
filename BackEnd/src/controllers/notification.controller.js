import { supabaseAdmin } from '../config/supabase.js'

/**
 * getNotifications(req, res, next)
 * - Fetch notifications where user_id = req.user.id
 * - Order by created_at DESC, limit 50
 * - Returns { notifications: [...], unread_count }
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Fetch user's profile to get last_notification_viewed_at
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('last_notification_viewed_at')
      .eq('id', userId)
      .single()

    if (profileError) return next(profileError)

    // Fetch up to 50 latest notifications
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) return next(fetchError)

    // Fetch count of unread notifications
    let countQuery = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (profile && profile.last_notification_viewed_at) {
      countQuery = countQuery.gt('created_at', profile.last_notification_viewed_at)
    }

    const { count: unreadCount, error: countError } = await countQuery

    if (countError) return next(countError)

    return res.status(200).json({
      notifications: notifications || [],
      unread_count: unreadCount || 0
    })
  } catch (error) {
    next(error)
  }
}

/**
 * updateLastViewed(req, res, next)
 * - Updates last_notification_viewed_at = now() for the logged-in user's profile
 * - Returns success response with updated timestamp
 */
export const updateLastViewed = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ last_notification_viewed_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) return next(error)

    return res.status(200).json({
      message: 'Notification viewed timestamp updated successfully',
      last_notification_viewed_at: data.last_notification_viewed_at
    })
  } catch (error) {
    next(error)
  }
}

/**
 * markAsRead(req, res, next)
 * - Body: { notification_ids: uuid[] } OR mark all if empty array
 * - Updates is_read = true for matching notifications belonging to req.user
 * - Returns { updated_count }
 */
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { notification_ids } = req.body

    let ids = notification_ids
    if (req.params.id) {
      ids = [req.params.id]
    }

    let query = supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids)
    } else {
      // Mark all unread notifications of this user as read
      query = query.eq('is_read', false)
    }

    const { data, error } = await query.select()

    if (error) return next(error)

    return res.status(200).json({
      updated_count: data ? data.length : 0
    })
  } catch (error) {
    next(error)
  }
}

