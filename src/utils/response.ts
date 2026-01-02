import { FastifyReply } from 'fastify';
import { ApiResponse, PaginatedResponse } from '@shared';

/**
 * Send success response
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, message?: string) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  return reply.send(response);
}

/**
 * Send paginated response
 */
export function sendPaginatedSuccess<T>(
  reply: FastifyReply,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
) {
  const response = {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    message,
    timestamp: new Date().toISOString(),
  };
  return reply.send(response);
}

/**
 * Send error response
 */
export function sendError(reply: FastifyReply, statusCode: number, error: string) {
  const response: ApiResponse<null> = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(response);
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(reply: FastifyReply, data: T, message?: string) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message: message || 'Resource created successfully',
    timestamp: new Date().toISOString(),
  };
  return reply.status(201).send(response);
}

/**
 * Send bad request error
 */
export function sendBadRequest(reply: FastifyReply, error: string) {
  return sendError(reply, 400, error);
}

/**
 * Send unauthorized error
 */
export function sendUnauthorized(reply: FastifyReply, error: string = 'Unauthorized') {
  return sendError(reply, 401, error);
}

/**
 * Send forbidden error
 */
export function sendForbidden(reply: FastifyReply, error: string = 'Forbidden') {
  return sendError(reply, 403, error);
}

/**
 * Send not found error
 */
export function sendNotFound(reply: FastifyReply, error: string = 'Resource not found') {
  return sendError(reply, 404, error);
}

/**
 * Send validation error
 */
export function sendValidationError(
  reply: FastifyReply,
  errors: Record<string, string[]>
) {
  return reply.status(422).send({
    success: false,
    error: 'Validation failed',
    errors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send server error
 */
export function sendServerError(reply: FastifyReply, error: string = 'Internal server error') {
  return sendError(reply, 500, error);
}
