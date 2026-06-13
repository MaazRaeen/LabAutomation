export const getMarksRevisions = async (req, res, next) => {
  try {
    res.json({ message: 'Get marks revisions' })
  } catch (error) {
    next(error)
  }
}

export const requestMarksRevision = async (req, res, next) => {
  try {
    res.json({ message: 'Request marks revision' })
  } catch (error) {
    next(error)
  }
}
