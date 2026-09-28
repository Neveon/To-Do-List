export type ApiErrorCode = 'VALIDATION_ERROR' | 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  /** Dot-separated path of the invalid field, e.g. `title`; empty for whole-body errors. */
  path: string;
  message: string;
}

/** Body of every non-2xx API response. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}
