import { useState } from "react";

export function useConfirmationDialog<T>() {
  const [item, setItem] = useState<T | null>(null);

  return {
    open: item !== null,
    item,
    openFor: (value: T) => setItem(value),
    close: () => setItem(null),
  };
}