import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function getHeaders(isFormData = false) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMsg = 'An error occurred'
    try {
      const errorData = await response.json()
      errorMsg = errorData.error || errorData.message || errorMsg
    } catch (e) {
      errorMsg = response.statusText || errorMsg
    }
    throw new Error(errorMsg)
  }

  if (response.status === 204) {
    return null
  }

  try {
    return await response.json()
  } catch (e) {
    return null
  }
}

export async function apiGet(path: string) {
  const headers = await getHeaders()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  })
  return handleResponse(response)
}

export async function apiPost(path: string, body?: any) {
  const headers = await getHeaders()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(response)
}

export async function apiPut(path: string, body?: any) {
  const headers = await getHeaders()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(response)
}

export async function apiDelete(path: string) {
  const headers = await getHeaders()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(response)
}

export async function apiPostFormData(path: string, formData: FormData) {
  const headers = await getHeaders(true)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  return handleResponse(response)
}
