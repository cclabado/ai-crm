import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PublicAuthCard from '../components/auth/PublicAuthCard'
import Button from '../components/ui/Button'
import { api } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/auth/forgot-password', { email })
      setMessage(data.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicAuthCard
      title="Reset your password"
      description="Enter your account email and we will send a secure reset link if an account exists."
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500"
          />
        </label>
        {message && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
        <Link to="/login" className="block text-center text-sm text-blue-600">
          Back to sign in
        </Link>
      </form>
    </PublicAuthCard>
  )
}
