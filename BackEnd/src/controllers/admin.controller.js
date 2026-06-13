export const getUsers = async (req, res, next) => {
  try {
    res.json({ message: 'Admin: Get users' })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req, res, next) => {
  try {
    res.json({ message: 'Admin: Delete user' })
  } catch (error) {
    next(error)
  }
}
