import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlert } from "lucide-react"
import { useState } from "react"
import { type Path, useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router"

import { authApi } from "@/api/endpoints/auth"
import { type ApiError, isApiError } from "@/api/errors"
import type { AuthResponse } from "@/api/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useCountdown } from "@/hooks/use-countdown"
import { useSession } from "@/stores/session"

import {
  signinSchema,
  type SigninValues,
  signupSchema,
  type SignupValues,
} from "../schemas"
import { safeReturnTo } from "../session"
import { PasswordInput } from "./password-input"

type Mode = "signin" | "signup"
type Values = SigninValues & Partial<Pick<SignupValues, "confirmPassword">>

const copy = {
  signin: {
    title: "Sign in",
    description: "Welcome back. Sign in to your documents.",
    submit: "Sign in",
    switchText: "Don't have an account?",
    switchLink: "Sign up",
    switchTo: "/signup",
  },
  signup: {
    title: "Create an account",
    description: "Upload PDFs and ask cited questions about them.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchTo: "/signin",
  },
} as const

function serverMessage(error: ApiError, mode: Mode): string {
  switch (error.slug) {
    case "unauthorized":
      return "Invalid email or password."
    case "conflict":
      return "An account with this email already exists."
    case "network":
      return error.detail ?? error.title
    default:
      return mode === "signin"
        ? "We couldn't sign you in. Please try again."
        : "We couldn't create your account. Please try again."
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const text = copy[mode]
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const signedIn = useSession((s) => s.signedIn)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const secondsLeft = useCountdown(blockedUntil)

  const form = useForm<Values>({
    resolver: zodResolver(mode === "signup" ? signupSchema : signinSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  const mutation = useMutation<AuthResponse, unknown, Values>({
    mutationFn: ({ email, password }) =>
      mode === "signup"
        ? authApi.signup({ email, password })
        : authApi.signin({ email, password }),
    meta: { silent: true },
    onSuccess: (res) => {
      signedIn(res.access_token, res.user)
      void navigate(safeReturnTo(searchParams.get("returnTo")), {
        replace: true,
      })
    },
    onError: (error) => {
      if (!isApiError(error)) return
      if (error.slug === "validation-error") {
        for (const field of ["email", "password"] as const) {
          const message = error.fieldError(field)
          if (message) form.setError(field, { message })
        }
      }
      if (error.status === 429) {
        setBlockedUntil(Date.now() + (error.retryAfter ?? 30) * 1000)
      }
      if (error.slug === "unauthorized") {
        form.resetField("password")
        form.setFocus("password")
      }
    },
  })

  const error = isApiError(mutation.error) ? mutation.error : null
  const pending = mutation.isPending
  const showServerAlert =
    error !== null &&
    error.slug !== "validation-error" &&
    !(error.status === 429 && secondsLeft === 0)

  const fieldProps = (name: Path<Values>) => {
    const fieldError = form.formState.errors[name]
    return {
      id: name,
      readOnly: pending,
      "aria-invalid": fieldError ? true : undefined,
      "aria-describedby": fieldError ? `${name}-error` : undefined,
      ...form.register(name),
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">{text.title}</h1>
        </CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <CardContent>
          <FieldGroup>
            {showServerAlert && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  {error.status === 429
                    ? `Too many attempts, try again in ${secondsLeft} s`
                    : serverMessage(error, mode)}
                </AlertTitle>
                {error.requestId && error.status >= 500 && (
                  <AlertDescription className="font-mono text-xs">
                    Request ID: {error.requestId}
                  </AlertDescription>
                )}
              </Alert>
            )}
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                {...fieldProps("email")}
              />
              <FieldError
                id="email-error"
                errors={[form.formState.errors.email]}
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                {...fieldProps("password")}
              />
              <FieldError
                id="password-error"
                errors={[form.formState.errors.password]}
              />
            </Field>
            {mode === "signup" && (
              <Field data-invalid={!!form.formState.errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <PasswordInput
                  autoComplete="new-password"
                  {...fieldProps("confirmPassword")}
                />
                <FieldError
                  id="confirmPassword-error"
                  errors={[form.formState.errors.confirmPassword]}
                />
              </Field>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pending || secondsLeft > 0}
          >
            {pending && <Spinner />}
            {text.submit}
          </Button>
          <p className="text-muted-foreground">
            {text.switchText}{" "}
            <Link
              to={{ pathname: text.switchTo, search: searchParams.toString() }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {text.switchLink}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
