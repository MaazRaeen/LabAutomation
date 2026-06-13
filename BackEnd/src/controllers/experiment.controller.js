export const getExperiments = async (req, res, next) => {
  try {
    res.json({ message: 'Get experiments' })
  } catch (error) {
    next(error)
  }
}

export const createExperiment = async (req, res, next) => {
  try {
    res.json({ message: 'Create experiment' })
  } catch (error) {
    next(error)
  }
}
