import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PublicAuthCard from '../components/auth/PublicAuthCard'
import Button from '../components/ui/Button'
import { api } from '../lib/api'

export default function AcceptInvitationPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/api/v1/invitations/accept', {
        token,
        name,
        password,
        password_confirmation: confirmation,
      })
      navigate('/login', { replace: true })
    } catch {
      setError('The invitation is invalid, expired, or the supplied account details are not valid.')
    }
  }
  return (
    <PublicAuthCard
      title="Join your CRM workspace"
      description="Complete your profile to accept the organization invitation."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            minLength={12}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</span>
          <input
            type="password"
            minLength={12}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          />
        </label>
        <Button type="submit" className="w-full">
          Accept invitation
        </Button>
      </form>
    </PublicAuthCard>
  )
}
