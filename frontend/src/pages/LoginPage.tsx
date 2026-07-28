import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { ArrowRight, Layers, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../app/AuthContext'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must contain at least 8 characters.'),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  })

  useEffect(() => {
    document.title = 'Sign in · CRM & Sales Pipeline'
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values)
      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.errors?.email?.[0]) {
        setError('email', { message: error.response.data.errors.email[0] }, { shouldFocus: true })
      } else {
        setError('root', { message: 'Unable to sign in. Check your connection and try again.' })
      }
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.75fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,0.42),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.22),transparent_35%)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold">CRM & Sales Pipeline</p>
            <p className="text-xs text-slate-400">Business workspace</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            AI Powered CRM & Sales Pipeline
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Build stronger relationships. Close more business.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            A secure workspace for your customers, pipeline, tasks, support, reporting, and optional AI
            assistance.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">
          Your core CRM remains fully operational when AI is disabled.
        </p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Layers className="h-4 w-4 text-white" />
            </span>
            <p className="font-bold text-slate-900">CRM & Sales Pipeline</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your CRM workspace.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {errors.root && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errors.root.message}
              </div>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
              <span className="relative block">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  {...register('email')}
                  autoComplete="email"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                />
              </span>
              {errors.email && (
                <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>
              )}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <LockKeyhole
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 focus:border-blue-500"
                  aria-invalid={!!errors.password}
                />
              </span>
              {errors.password && (
                <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>
              )}
            </label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  {...register('remember')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Remember me
              </label>
              <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Demo: admin@nexuscrm.test / Password123!</p>
        </div>
      </section>
    </main>
  )
}
