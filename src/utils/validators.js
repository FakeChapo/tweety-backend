/**
 * @file utils/validators.js
 * @description Joi schemas for validating request bodies and query parameters.
 */

import Joi from "joi";

/**
 * Registration validation schema.
 */
export const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(32).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
});

/**
 * Login validation schema.
 */
export const loginSchema = Joi.object({
    usernameOrEmail: Joi.string().required(),
    password: Joi.string().required()
});

/**
 * Event creation validation schema.
 */
export const eventCreateSchema = Joi.object({
    otherName: Joi.string().min(1).max(128).required(),
    otherId: Joi.string().min(1).max(128).required(),
    type: Joi.string().min(1).max(64).required(),
    description: Joi.string().allow("").max(1024)
});

/**
 * Query parameter validation for GET /events.
 */
export const eventQuerySchema = Joi.object({
    type: Joi.string().min(1).max(64).optional(),
    timestamp: Joi.date().iso().optional()
});

/**
 * Validate request with a given Joi schema.
 * @param {Joi.ObjectSchema} schema
 * @param {any} data
 * @returns {{ value: any, error: any }}
 */
export function validate(schema, data) {
    return schema.validate(data, { abortEarly: false, stripUnknown: true });
}
