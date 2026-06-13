export const getLabRecords = async (req, res, next) => {
  try {
    res.json({ message: 'Get lab records' })
  } catch (error) {
    next(error)
  }
}

export const uploadLabRecord = async (req, res, next) => {
  try {
    res.json({ message: 'Upload lab record' })
  } catch (error) {
    next(error)
  }
}
