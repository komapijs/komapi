// Dependencies
import Joi from 'joi';

// Exports
/**
 * Validate configuration and show a user friendly error message if the configuration is not valid
 *
 * @param {Object} data - User configuration to validate
 * @param {Object} schema - Schema to use for validation
 * @param {string} [message=Invalid config provided] - Optional error message to display
 * @returns {Object} - Returns the valid configuration with defaults applied if applicable
 */
export default function validate(data, schema, message = 'Invalid config provided') {
  const result = Joi.validate(data, schema(Joi));
  if (result.error) throw new Error(`${message}: ${result.error.annotate()}`);
  return result.value;
}
