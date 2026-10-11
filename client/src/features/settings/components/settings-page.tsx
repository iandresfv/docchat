import { useMutation, useQuery } from "@tanstack/react-query"
import { LogOut, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

import { usageApi } from "@/api/endpoints/usage"
import type { UsagePeriod } from "@/api/types"
import { PageHeader } from "@/components/shared/page-header"
import { ShortcutsTable } from "@/components/shared/shortcuts-table"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { signOut } from "@/features/auth/session"
import { formatCost, formatTokens } from "@/lib/format"
import { strings } from "@/lib/strings"
import { useBreadcrumbs } from "@/stores/breadcrumbs"
import { type Theme, usePreferences } from "@/stores/preferences"
import { useSession } from "@/stores/session"

export function SettingsPage() {
  useBreadcrumbs([{ label: strings.nav.settings }])

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <PageHeader title={strings.nav.settings} />
        <AppearanceSection />
        <ChatSection />
        <UsageSection />
        <AccountSection />
        <Section
          title="Keyboard shortcuts"
          description="Press ? anywhere to see these."
        >
          <ShortcutsTable />
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

/** Label left, control right; stacks below 768 px (04 §4.5). */
function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="md:shrink-0">{children}</div>
    </div>
  )
}

function AppearanceSection() {
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)
  return (
    <Section title="Appearance">
      <Row label="Theme" hint="System follows your operating system setting.">
        <RadioGroup
          aria-label="Theme"
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
          className="flex gap-4"
        >
          {(["system", "light", "dark"] as const).map((value) => (
            <label
              key={value}
              className="flex items-center gap-2 text-sm capitalize"
            >
              <RadioGroupItem value={value} />
              {value}
            </label>
          ))}
        </RadioGroup>
      </Row>
    </Section>
  )
}

function ChatSection() {
  const streamAnswers = usePreferences((s) => s.streamAnswers)
  const setStreamAnswers = usePreferences((s) => s.setStreamAnswers)
  const showUsage = usePreferences((s) => s.showUsage)
  const setShowUsage = usePreferences((s) => s.setShowUsage)
  return (
    <Section title="Chat">
      <Row
        label="Stream answers by default"
        hint="Show tokens as they arrive. You can still toggle it per conversation."
        htmlFor="pref-stream"
      >
        <Switch
          id="pref-stream"
          checked={streamAnswers}
          onCheckedChange={setStreamAnswers}
        />
      </Row>
      <Row
        label="Show token usage under answers"
        hint="Latency, tokens in/out and cost of each answer."
        htmlFor="pref-usage"
      >
        <Switch
          id="pref-usage"
          checked={showUsage}
          onCheckedChange={setShowUsage}
        />
      </Row>
    </Section>
  )
}

function UsageSection() {
  const usage = useQuery({ queryKey: ["usage", "me"], queryFn: usageApi.me })

  return (
    <Section title="Usage" description="Tokens and cost of your answers.">
      {usage.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-4 rounded" />
        </div>
      ) : usage.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load usage.</AlertTitle>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void usage.refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageTile label="Today" period={usage.data.today} />
            <UsageTile label="This month" period={usage.data.month} />
          </div>
          <Progress
            value={Math.min(
              100,
              Math.round(
                (usage.data.today.tokens / usage.data.limits.daily_tokens) * 100
              )
            )}
          >
            <ProgressLabel>
              Daily budget {formatTokens(usage.data.today.tokens)} /{" "}
              {formatTokens(usage.data.limits.daily_tokens)} tokens
            </ProgressLabel>
            <ProgressValue />
          </Progress>
        </>
      )}
    </Section>
  )
}

function UsageTile({ label, period }: { label: string; period: UsagePeriod }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {[
          ["Tokens", formatTokens(period.tokens)],
          ["Messages", String(period.messages)],
          ["Cost", formatCost(period.cost_usd)],
        ].map(([term, value]) => (
          <div key={term}>
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="text-base font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function AccountSection() {
  const user = useSession((s) => s.user)
  const signOutMutation = useMutation({
    mutationFn: (everywhere: boolean) => signOut({ everywhere }),
  })
  const pending = signOutMutation.isPending

  return (
    <Section title="Account">
      <Row label="Email" htmlFor="account-email">
        <Input
          id="account-email"
          value={user?.email ?? ""}
          readOnly
          className="md:w-72"
        />
      </Row>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => signOutMutation.mutate(false)}
        >
          {pending && !signOutMutation.variables ? <Spinner /> : <LogOut />}
          Sign out
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => signOutMutation.mutate(true)}
        >
          {pending && signOutMutation.variables && <Spinner />}
          Sign out everywhere
        </Button>
      </div>
    </Section>
  )
}
