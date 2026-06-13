export const getNotifications = async (req, res, next) => {
  try {
    res.json({ message: 'Get notifications' })
  } catch (error) {
    next(error)
  }
}

export const markAsRead = async (req, res, next) => {
  try {
    res.json({ message: 'Mark notification as read' })
  } catch (error) {
    next(error)
  }
}
