import type { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '@todo/shared';

export type ApiErrorKind = ApiErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

/** A failed API call, carrying the server's error code and per-field details when available. */
export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    /** HTTP status, or 0 when the server could not be reached. */
    readonly status: number,
    readonly code: ApiErrorKind,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Sends a request to the API and returns the parsed JSON body (`undefined` for 204).
 * Non-2xx responses and network failures are thrown as ApiError; aborts are rethrown as-is.
 */
export async function request<T>(
  path: string,
  { body, ...init }: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(`/api${path}`, window.location.origin), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (init.signal?.aborted) {
      throw cause;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is it running?', [], {
      cause,
    });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = (await response.json()) as ApiErrorResponse;
    return new ApiError(response.status, error.code, error.message, error.details);
  } catch {
    // Not our JSON error format, e.g. a proxy error page.
    return new ApiError(
      response.status,
      'UNKNOWN_ERROR',
      `Request failed with status ${response.status}`,
    );
  }
}
