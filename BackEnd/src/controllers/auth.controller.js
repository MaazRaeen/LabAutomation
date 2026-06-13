export const register = async (req, res, next) => {
  try {
    res.json({ message: 'Auth register route' })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    res.json({ message: 'Auth login route' })
  } catch (error) {
    next(error)
  }
}

export const getMe = async (req, res, next) => {
  try {
    res.json({ message: 'Auth getMe route', user: req.user })
  } catch (error) {
    next(error)
  }
}
