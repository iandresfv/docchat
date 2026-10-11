import { FileQuestion } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { strings } from "@/lib/strings"

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>
            <h1>{strings.notFound.title}</h1>
          </EmptyTitle>
          <EmptyDescription>{strings.notFound.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/documents" />} nativeButton={false}>
            {strings.notFound.action}
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
