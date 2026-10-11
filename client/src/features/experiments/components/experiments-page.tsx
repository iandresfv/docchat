import { PageHeader } from "@/components/shared/page-header"
import { strings } from "@/lib/strings"
import { useBreadcrumbs } from "@/stores/breadcrumbs"

export function ExperimentsPage() {
  useBreadcrumbs([{ label: strings.nav.experiments }])
  return (
    <div className="p-4 md:p-6">
      <PageHeader title={strings.nav.experiments} />
    </div>
  )
}
