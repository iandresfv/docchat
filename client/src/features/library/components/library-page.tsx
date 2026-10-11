import { PageHeader } from "@/components/shared/page-header"
import { strings } from "@/lib/strings"
import { useBreadcrumbs } from "@/stores/breadcrumbs"

export function LibraryPage() {
  useBreadcrumbs([{ label: strings.nav.library }])
  return (
    <div className="p-4 md:p-6">
      <PageHeader title={strings.nav.library} />
    </div>
  )
}
