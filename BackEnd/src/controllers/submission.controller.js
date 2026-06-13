export const getSubmissions = async (req, res, next) => {
  try {
    res.json({ message: 'Get submissions' })
  } catch (error) {
    next(error)
  }
}

export const createSubmission = async (req, res, next) => {
  try {
    res.json({ message: 'Create submission' })
  } catch (error) {
    next(error)
  }
}
