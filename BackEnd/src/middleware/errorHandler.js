export const errorHandler = (err, req, res, next) => {
  // Always log the full error for server debugging
  console.error('Error Intercepted by Global Handler:', err)

  if (err.isZodError || err.name === 'ZodError') {
    return res.status(422).json({
      error: 'Validation Error',
      errors: err.errors || err.details || err.message,
    })
  }

  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode
    return res.status(status).json({ error: err.message })
  }

  return res.status(500).json({ error: 'Internal server error' })
}

export default errorHandler
