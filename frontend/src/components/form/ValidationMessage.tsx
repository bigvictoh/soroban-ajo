interface ValidationMessageProps {
  message?: string
  id?: string
}

export function ValidationMessage({ message, id }: ValidationMessageProps) {
  if (!message) return null

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1 text-sm text-red-500"
    >
      {message}
    </p>
  )
}
