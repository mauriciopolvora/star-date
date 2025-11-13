import { type MutableRefObject, type RefObject, useEffect } from "react";

type PossibleRef<T extends HTMLElement> =
  | RefObject<T | null>
  | MutableRefObject<T | null>;

export default function useClickOutside<T extends HTMLElement>(
  ref: PossibleRef<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (!element) {
        return;
      }
      if (event.target instanceof Node && element.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}
