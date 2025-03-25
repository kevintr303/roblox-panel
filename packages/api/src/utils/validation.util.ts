import { Elysia } from 'elysia';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Standard HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Map of HTTP status codes to error codes
 */
const ERROR_CODES: Record<HttpStatus, string> = {
  [HttpStatus.OK]: 'SUCCESS',
  [HttpStatus.CREATED]: 'RESOURCE_CREATED',
  [HttpStatus.NO_CONTENT]: 'NO_CONTENT',
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'RESOURCE_CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

export type ResponseStatus = 'success' | 'error';

/**
 * Base API response interface
 */
export interface ApiResponse {
  status: ResponseStatus;
  statusCode: number;
  requestId: string;
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  path?: string;
  suggestion?: string;
  fields?: {
    field: string;
    message: string;
  }[];
}

export interface ApiErrorResponse extends ApiResponse {
  status: 'error';
  error: ErrorDetails;
}

export interface ApiSuccessResponse<T = unknown> extends ApiResponse {
  status: 'success';
  data: T;
}

export class ApiError extends Error {
  statusCode: HttpStatus;
  errorCode: string;
  details?: string;
  suggestion?: string;
  path?: string;
  fields?: { field: string; message: string }[];

  constructor(options: {
    statusCode: HttpStatus;
    message: string;
    errorCode?: string;
    details?: string;
    suggestion?: string;
    path?: string;
    fields?: { field: string; message: string }[];
  }) {
    super(options.message);
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode || ERROR_CODES[options.statusCode] || 'UNKNOWN_ERROR';
    this.details = options.details;
    this.suggestion = options.suggestion;
    this.path = options.path;
    this.fields = options.fields;
    this.name = 'ApiError';
  }
}

/**
 * Create and throw an API error
 */
export const throwError = (
  statusCode: HttpStatus,
  message: string,
  options?: {
    errorCode?: string;
    details?: string;
    suggestion?: string;
    path?: string;
    fields?: { field: string; message: string }[];
  }
): never => {
  throw new ApiError({
    statusCode,
    message,
    ...options,
  });
};

/**
 * Format an API error into a standardized response
 */
export const formatApiError = (error: ApiError, path?: string): ApiErrorResponse => {
  return {
    status: 'error',
    statusCode: error.statusCode,
    requestId: randomUUID(),
    error: {
      code: error.errorCode,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      path: error.path || path,
      suggestion: error.suggestion,
      fields: error.fields,
    },
  };
};

/**
 * Format Zod validation errors
 */
export const formatZodError = (error: ZodError, path?: string): ApiErrorResponse => {
  const fields = error.errors.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));

  return {
    status: 'error',
    statusCode: HttpStatus.BAD_REQUEST,
    requestId: randomUUID(),
    error: {
      code: ERROR_CODES[HttpStatus.BAD_REQUEST],
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
      path,
      suggestion: 'Please check the request format and try again',
      fields,
    },
  };
};

/**
 * Format a success response
 */
export const formatSuccess = <T>(
  data: T,
  statusCode: HttpStatus = HttpStatus.OK
): ApiSuccessResponse<T> => {
  return {
    status: 'success',
    statusCode,
    requestId: randomUUID(),
    data,
  };
};

/**
 * Check if the path should be excluded from standardization
 */
const shouldExcludePath = (path: string): boolean => {
  // Exclude Swagger documentation routes
  if (path.includes('/api/docs')) {
    return true;
  }
  return false;
};

/**
 * Global error handler for Elysia
 */
export const errorHandler = (app: Elysia): Elysia => {
  app.derive(({ request }) => {
    const pathname = request.url.split('?')[0];
    return { path: pathname };
  });

  app.onAfterHandle(({ response, path }) => {
    if (path && shouldExcludePath(path)) {
      return response;
    }

    if (
      response === null ||
      response === undefined ||
      typeof response !== 'object' ||
      ('status' in response && (response.status === 'success' || response.status === 'error'))
    ) {
      return response;
    }

    return formatSuccess(response);
  });

  return app.onError(({ error, set, path }) => {
    if (path && shouldExcludePath(path)) {
      set.status = 500;
      return error instanceof Error ? error.message : 'Unknown error';
    }

    if (error instanceof ZodError) {
      set.status = HttpStatus.BAD_REQUEST;
      return formatZodError(error, path);
    }

    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return formatApiError(error, path);
    }

    set.status = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      requestId: randomUUID(),
      error: {
        code: ERROR_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
        message: error instanceof Error ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        path,
      },
    };
  });
};
