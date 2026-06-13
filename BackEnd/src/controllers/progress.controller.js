export const getProgress = async (req, res, next) => {
  try {
    res.json({ message: 'Get progress dashboard data' })
  } catch (error) {
    next(error)
  }
}
