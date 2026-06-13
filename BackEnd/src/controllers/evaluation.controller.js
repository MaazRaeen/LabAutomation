export const getEvaluations = async (req, res, next) => {
  try {
    res.json({ message: 'Get evaluations' })
  } catch (error) {
    next(error)
  }
}

export const createEvaluation = async (req, res, next) => {
  try {
    res.json({ message: 'Create evaluation' })
  } catch (error) {
    next(error)
  }
}
