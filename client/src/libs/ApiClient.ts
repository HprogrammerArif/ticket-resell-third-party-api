import { cookies } from 'next/headers';
import { Env } from '@/libs/Env';

/**
 * Interface for API request options.
 */
export type ApiRequestOptions = RequestInit & {
  params?: Record<string, string>;
};

/**
 * Custom error class for API responses that are not OK.
 */
export class ApiError extends Error {
  public status: number;

  public data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Gets the JWT auth token from the cookies.
 *
 * Returns undefined if not in a server request context or cookie is missing.
 * @returns The token or undefined.
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth_token')?.value;
  } catch {
    // Gracefully handle calling outside of request context (e.g. during static generation/build)
    return undefined;
  }
}

/**
 * Performs an HTTP request to the external backend.
 * @param path The API endpoint path.
 * @param options Request options including parameters and headers.
 * @returns The parsed JSON response.
 * @throws ApiError if response is not ok.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = Env.BACKEND_API_URL ?? 'http://localhost:8000';

  // Format the path and query params
  let url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Automatically attach auth token if present
  const token = await getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      const rawError: unknown = await response.json();
      errorData = rawError;
    } catch {
      errorData = null;
    }
    throw new ApiError(
      response.status,
      `API request failed with status ${response.status}`,
      errorData,
    );
  }

  // Handle empty or text responses
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    const rawJson: unknown = await response.json();
    return rawJson as T;
  }

  const rawText: unknown = await response.text();
  return rawText as T;
}

/**
 * Helper methods for common HTTP verbs.
 */
export const ApiClient = {
  /**
   * Performs a GET request.
   * @param path The API endpoint path.
   * @param options Request options.
   * @returns The parsed JSON response.
   */
  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return await apiRequest<T>(path, { ...options, method: 'GET' });
  },

  /**
   * Performs a POST request.
   * @param path The API endpoint path.
   * @param body The request body object.
   * @param options Request options.
   * @returns The parsed JSON response.
   */
  async post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return await apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Performs a PUT request.
   * @param path The API endpoint path.
   * @param body The request body object.
   * @param options Request options.
   * @returns The parsed JSON response.
   */
  async put<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return await apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * Performs a DELETE request.
   * @param path The API endpoint path.
   * @param options Request options.
   * @returns The parsed JSON response.
   */
  async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return await apiRequest<T>(path, { ...options, method: 'DELETE' });
  },
};
