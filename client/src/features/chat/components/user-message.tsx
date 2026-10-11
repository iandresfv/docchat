import { memo } from "react"

import type { Message } from "@/api/types"
import { formatDateTime, formatTime } from "@/lib/format"

export const UserMessage = memo(function UserMessage({
  message,
}: {
  message: Message
}) {
  return (
    <div className="group/user flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-xl bg-muted px-3.5 py-2 break-words whitespace-pre-wrap md:max-w-[70%]">
        {message.content}
      </div>
      <time
        dateTime={message.created_at}
        title={formatDateTime(message.created_at)}
        className="text-xs text-muted-foreground opacity-0 transition-opacity group-focus-within/user:opacity-100 group-hover/user:opacity-100"
      >
        {formatTime(message.created_at)}
      </time>
    </div>
  )
})
