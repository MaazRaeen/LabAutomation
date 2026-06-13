export const getResubmissions = async (req, res, next) => {
  try {
    res.json({ message: 'Get resubmissions' })
  } catch (error) {
    next(error)
  }
}

export const requestResubmission = async (req, res, next) => {
  try {
    res.json({ message: 'Request resubmission' })
  } catch (error) {
    next(error)
  }
}
