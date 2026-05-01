// Subscribe to a CSS media query. Re-renders the consumer when the match state flips.
//
// Used here mainly for phone detection: combining max-width with `(pointer: coarse)`
// so that an i3 screen-split pane on a desktop (narrow but mouse-driven) does NOT
// trigger phone mode; only actual touch devices below the breakpoint do.

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const get = (): boolean =>
    typeof window !== "undefined" && window.matchMedia(query).matches;

  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
