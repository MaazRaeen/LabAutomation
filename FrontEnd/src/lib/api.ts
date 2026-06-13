/**
 * Centralized API client for the LabEval Pro Express backend.
 *
 * All write/mutation requests are routed through the Express backend at VITE_API_URL.
 * Each request automatically includes the user's Supabase JWT as an Authorization header,
 * which the backend's `auth` middleware uses to validate identity and set req.user.
 *
 * Usage:
 *   import { apiPost, apiGet, apiPut, apiPatch, apiDelete, apiPostFormData } from '../lib/api'
 */

import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  const session = useAuthStore.getState().session
  return session?.access_token ?? null
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      errMessage = body?.error || body?.message || errMessage
    } catch {
      // ignore parse error, keep default message
    }
    throw new Error(errMessage)
  }
  return res.json() as Promise<T>
}

// ─── Core Request Methods ─────────────────────────────────────────────────────

/** GET /api/<path> */
export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  })
  return handleResponse<T>(res)
}

/** POST /api/<path> with JSON body */
export async function apiPost<T = any>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

/** PUT /api/<path> with JSON body */
export async function apiPut<T = any>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

/** PATCH /api/<path> with JSON body */
export async function apiPatch<T = any>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

/** DELETE /api/<path> */
export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })
  return handleResponse<T>(res)
}

/**
 * POST /api/<path> with a FormData body (for file uploads).
 * Does NOT set Content-Type header — the browser sets it automatically with the correct boundary.
 */
export async function apiPostFormData<T = any>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  return handleResponse<T>(res)
}
