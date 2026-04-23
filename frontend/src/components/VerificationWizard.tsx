'use client'

import React, { useState } from 'react'
import { useVerification } from '@/hooks/useVerification'

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'selfie', label: 'Selfie with ID' },
]

const LEVEL_LABELS: Record<number, string> = {
  0: 'Unverified',
  1: 'Email Verified',
  2: 'Phone + Email',
  3: 'Fully Verified',
}

function TrustScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Trust Score</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

type Step = 'overview' | 'email' | 'phone' | 'documents'

export function VerificationWizard() {
  const { status, loading, error, sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp, uploadDocument } =
    useVerification()

  const [step, setStep] = useState<Step>('overview')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ type: 'success', text: 'Done!' })
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Identity Verification</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          Level {status?.kycLevel ?? 0} — {LEVEL_LABELS[status?.kycLevel ?? 0]}
        </span>
      </div>

      {status && <TrustScoreBar score={status.trustScore} />}

      {/* Status badges */}
      {status && (
        <div className="flex gap-3 flex-wrap">
          <Badge label="Email" verified={status.emailVerified} />
          <Badge label="Phone" verified={status.phoneVerified} />
          <Badge label="KYC" verified={status.kycStatus === 'approved'} pending={status.kycStatus === 'pending'} />
        </div>
      )}

      {/* Step navigation */}
      {step === 'overview' && (
        <div className="space-y-3">
          {!status?.emailVerified && (
            <StepButton onClick={() => setStep('email')} label="Verify Email" icon="✉️" />
          )}
          {status?.emailVerified && !status?.phoneVerified && (
            <StepButton onClick={() => setStep('phone')} label="Verify Phone" icon="📱" />
          )}
          {status?.emailVerified && (
            <StepButton onClick={() => setStep('documents')} label="Upload Identity Documents" icon="📄" />
          )}
          {status?.kycStatus === 'approved' && (
            <p className="text-green-600 font-medium text-center">✅ Fully verified!</p>
          )}
          {status?.kycStatus === 'pending' && (
            <p className="text-yellow-600 text-center text-sm">⏳ Documents under review</p>
          )}
          {status?.kycStatus === 'rejected' && (
            <p className="text-red-600 text-center text-sm">❌ Verification rejected. Please re-upload documents.</p>
          )}
        </div>
      )}

      {step === 'email' && (
        <div className="space-y-3">
          <h3 className="font-semibold">Verify your email</h3>
          {!otpSent ? (
            <>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <ActionButton
                label="Send OTP"
                busy={busy}
                onClick={() => wrap(async () => { await sendEmailOtp(email); setOtpSent(true) })}
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <ActionButton
                label="Verify"
                busy={busy}
                onClick={() => wrap(async () => { await verifyEmailOtp(otp); setStep('overview') })}
              />
            </>
          )}
          <Feedback msg={msg} />
          <BackButton onClick={() => { setStep('overview'); setOtpSent(false); setOtp('') }} />
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-3">
          <h3 className="font-semibold">Verify your phone</h3>
          {!otpSent ? (
            <>
              <input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <ActionButton
                label="Send OTP"
                busy={busy}
                onClick={() => wrap(async () => { await sendPhoneOtp(phone); setOtpSent(true) })}
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <ActionButton
                label="Verify"
                busy={busy}
                onClick={() => wrap(async () => { await verifyPhoneOtp(otp); setStep('overview') })}
              />
            </>
          )}
          <Feedback msg={msg} />
          <BackButton onClick={() => { setStep('overview'); setOtpSent(false); setOtp('') }} />
        </div>
      )}

      {step === 'documents' && (
        <div className="space-y-3">
          <h3 className="font-semibold">Upload identity document</h3>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {status?.documents && status.documents.length > 0 && (
            <ul className="text-xs space-y-1 text-gray-500">
              {status.documents.map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>{d.docType} — {d.fileName}</span>
                  <StatusPill status={d.status} />
                </li>
              ))}
            </ul>
          )}
          <ActionButton
            label="Upload"
            busy={busy}
            disabled={!file}
            onClick={() => wrap(async () => { await uploadDocument(docType, file!); setFile(null); setStep('overview') })}
          />
          <Feedback msg={msg} />
          <BackButton onClick={() => setStep('overview')} />
        </div>
      )}
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────

function Badge({ label, verified, pending }: { label: string; verified: boolean; pending?: boolean }) {
  const cls = verified
    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : pending
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>
      {verified ? '✓' : pending ? '⏳' : '○'} {label}
    </span>
  )
}

function StepButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      <span className="ml-auto text-gray-400">→</span>
    </button>
  )
}

function ActionButton({ label, busy, disabled, onClick }: { label: string; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
    >
      {busy ? 'Please wait…' : label}
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-gray-500 hover:underline">
      ← Back
    </button>
  )
}

function Feedback({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
      {msg.text}
    </p>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-500' : 'text-yellow-600'
  return <span className={`font-medium ${cls}`}>{status}</span>
}
