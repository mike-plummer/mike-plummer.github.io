'use client';

import { cloneElement, type MouseEvent, type ReactElement, useCallback } from 'react';

interface ScrollProps {
  type?: 'class' | 'id';
  element?: string;
  offset?: number;
  timeout?: number;
  children: ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;
}

export default function Scroll({ type, element, offset = 0, timeout, children }: ScrollProps) {
  const scrollTo = useCallback(
    (target: Element | null) => {
      if (!target) {
        return;
      }

      const elemPos = target.getBoundingClientRect().top + window.pageYOffset;

      const performScroll = () => {
        window.scroll({ top: elemPos + offset, left: 0, behavior: 'smooth' });
      };

      if (timeout) {
        window.setTimeout(performScroll, timeout);
      } else {
        performScroll();
      }
    },
    [offset, timeout]
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();

      if (!type || !element) {
        return;
      }

      let target: Element | null = null;

      if (type === 'class') {
        target = document.getElementsByClassName(element)[0] ?? null;
      } else if (type === 'id') {
        target = document.getElementById(element);
      }

      scrollTo(target);
    },
    [element, scrollTo, type]
  );

  return cloneElement(children, { onClick: handleClick });
}
