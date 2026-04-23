'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from './useAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface VerificationDoc {
  id: string
  docType: string
  fileName: string
  status: string
  createdAt: string
}

export interface VerificationStatus {
  kycLevel: number
  kycStatus: string
  kycRequestedAt?: string
  kycVerifiedAt?: string
  kycRejectedAt?: string
  emailVerified: boolean
  phoneVerified: boolean
  phone: string | null
  trustScore: number
  documents: VerificationDoc[]
}

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

export function useVerification() {
  const { session } = useAuthStore()
  const token = (session as any)?.token as string | undefined

  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiFetch('/api/verification', token)
      setStatus(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const sendEmailOtp = useCallback(async (email: string) => {
    if (!token) throw new Error('Not authenticated')
    await apiFetch('/api/verification/email/send', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  }, [token])

  const verifyEmailOtp = useCallback(async (otp: string) => {
    if (!token) throw new Error('Not authenticated')
    await apiFetch('/api/verification/email/verify', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    })
    await fetchStatus()
  }, [token, fetchStatus])

  const sendPhoneOtp = useCallback(async (phone: string) => {
    if (!token) throw new Error('Not authenticated')
    await apiFetch('/api/verification/phone/send', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
  }, [token])

  const verifyPhoneOtp = useCallback(async (otp: string) => {
    if (!token) throw new Error('Not authenticated')
    await apiFetch('/api/verification/phone/verify', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    })
    await fetchStatus()
  }, [token, fetchStatus])

  const uploadDocument = useCallback(async (docType: string, file: File) => {
    if (!token) throw new Error('Not authenticated')
    const form = new FormData()
    form.append('docType', docType)
    form.append('file', file)
    await apiFetch('/api/verification/documents', token, { method: 'POST', body: form })
    await fetchStatus()
  }, [token, fetchStatus])

  return {
    status,
    loading,
    error,
    fetchStatus,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    uploadDocument,
  }
}
