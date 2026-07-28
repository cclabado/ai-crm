import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../app/AuthContext'
import Button from '../components/ui/Button'
import { api } from '../lib/api'

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const profile = useMutation({
    mutationFn: () => api.patch('/api/v1/profile', { name, email }),
    onSuccess: refresh,
  })
  const password = useMutation({
    mutationFn: () => api.put('/api/v1/profile/password', passwords),
    onSuccess: () => setPasswords({ current_password: '', password: '', password_confirmation: '' }),
  })
  const submitProfile = (e: FormEvent) => {
    e.preventDefault()
    profile.mutate()
  }
  const submitPassword = (e: FormEvent) => {
    e.preventDefault()
    password.mutate()
  }
  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold">My Profile</h1>
        <p className="text-sm text-slate-500">Manage your personal information and password.</p>
      </div>
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
        <form onSubmit={submitProfile} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Personal information</h2>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Button type="submit">Save profile</Button>
        </form>
        <form onSubmit={submitPassword} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Change password</h2>
          <Field
            label="Current password"
            value={passwords.current_password}
            onChange={(value) => setPasswords({ ...passwords, current_password: value })}
            type="password"
          />
          <Field
            label="New password"
            value={passwords.password}
            onChange={(value) => setPasswords({ ...passwords, password: value })}
            type="password"
          />
          <Field
            label="Confirm password"
            value={passwords.password_confirmation}
            onChange={(value) => setPasswords({ ...passwords, password_confirmation: value })}
            type="password"
          />
          <Button type="submit">Change password</Button>
        </form>
      </div>
    </div>
  )
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
      />
    </label>
  )
}
