export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse the request body
      req.body = await schema.parseAsync(req.body)
      next()
    } catch (error) {
      // Extract and format Zod validation issues
      const formattedIssues = error.issues 
        ? error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        : error.message

      // Create a custom error object to be handled by errorHandler.js
      const validationError = new Error('Validation Error')
      validationError.isZodError = true
      validationError.errors = formattedIssues

      next(validationError)
    }
  }
}

export default validate
