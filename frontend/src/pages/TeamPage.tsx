import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Plus, Settings2, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../app/AuthContext'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'
import type { User } from '../types/auth'

interface Role {
  id: number
  name: string
  permissions: string[]
}
interface RolesResponse {
  data: Role[]
  available_permissions: string[]
}
interface UsersResponse {
  data: User[]
  meta: { total: number }
}

export default function TeamPage() {
  const { currentOrganization, user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')
  const [rolesOpen, setRolesOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] as string[] })
  const users = useQuery({
    queryKey: ['users', currentOrganization?.id],
    queryFn: async () => (await api.get<UsersResponse>('/api/v1/users')).data,
    enabled: !!currentOrganization,
  })
  const roles = useQuery({
    queryKey: ['roles', currentOrganization?.id],
    queryFn: async () => (await api.get<RolesResponse>('/api/v1/roles')).data,
    enabled: !!currentOrganization,
  })
  const invite = useMutation({
    mutationFn: () => api.post('/api/v1/invitations', { email, role }),
    onSuccess: () => {
      setMessage('Invitation queued for delivery.')
      setEmail('')
    },
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) =>
      api.patch(`/api/v1/users/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const saveRole = useMutation({
    mutationFn: () =>
      editingRole
        ? api.put(`/api/v1/roles/${editingRole.id}`, roleForm)
        : api.post('/api/v1/roles', roleForm),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      setRolesOpen(false)
    },
  })
  const submitInvite = (event: FormEvent) => {
    event.preventDefault()
    invite.mutate()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">Manage organization membership and access roles.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!roles.data}
            onClick={() => {
              const first = roles.data?.data[0] ?? null
              setEditingRole(first)
              setRoleForm(
                first ? { name: first.name, permissions: first.permissions } : { name: '', permissions: [] },
              )
              setRolesOpen(true)
            }}
          >
            <Settings2 className="h-4 w-4" /> Manage roles
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setRole(roles.data?.data[0]?.name ?? '')
              setInviteOpen(true)
            }}
            disabled={!roles.data}
          >
            <Plus className="h-4 w-4" /> Invite user
          </Button>
        </div>
      </div>
      {users.isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      )}
      {users.data?.data.length === 0 && (
        <EmptyState
          icon={Users}
          title="No team members"
          description="Invite the first member of this organization."
        />
      )}
      {!!users.data?.data.length && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Team member', 'Role', 'Status', 'Last login'].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.data.data.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role for ${member.name}`}
                      value={member.roles?.[0] ?? ''}
                      onChange={(event) =>
                        update.mutate({ id: member.id, payload: { role: event.target.value } })
                      }
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                      disabled={member.id === currentUser?.id}
                    >
                      {roles.data?.data.map((item) => (
                        <option key={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status for ${member.name}`}
                      value={member.status}
                      onChange={(event) =>
                        update.mutate({ id: member.id, payload: { status: event.target.value } })
                      }
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                      disabled={member.id === currentUser?.id}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {member.last_login_at ? new Date(member.last_login_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {inviteOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="invite-title" className="font-semibold text-slate-900">
                Invite team member
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close invite form"
                onClick={() => setInviteOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={submitInvite} className="mt-5 space-y-4">
              {message && (
                <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </p>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Role</span>
                <select
                  required
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  {roles.data?.data.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              {invite.isError && (
                <p role="alert" className="text-sm text-red-600">
                  The invitation could not be created.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending ? 'Sending…' : 'Send invitation'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
      {rolesOpen && roles.data && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              saveRole.mutate()
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Manage roles and permissions</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close role manager"
                onClick={() => setRolesOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.data.data.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setEditingRole(item)
                    setRoleForm({ name: item.name, permissions: item.permissions })
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${editingRole?.id === item.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                >
                  {item.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null)
                  setRoleForm({ name: '', permissions: [] })
                }}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs"
              >
                <Plus className="mr-1 inline h-3 w-3" />
                New role
              </button>
            </div>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium">Role name</span>
              <input
                required
                value={roleForm.name}
                onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium">Permissions</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roles.data.available_permissions.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(permission)}
                      onChange={(event) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: event.target.checked
                            ? [...roleForm.permissions, permission]
                            : roleForm.permissions.filter((item) => item !== permission),
                        })
                      }
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>
            {saveRole.isError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                The role could not be saved. Check your permission and role name.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRolesOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveRole.isPending}>
                {saveRole.isPending ? 'Saving…' : 'Save role'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
