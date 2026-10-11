import { useMediaQuery } from "./use-media-query"

const MOBILE_BREAKPOINT = 768

// Registry hook rewritten on top of useMediaQuery (no setState in effects).
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}
