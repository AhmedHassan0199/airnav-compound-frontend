// src/lib/loaderManager.ts
let activeRequests = 0;
let listeners: ((active: number) => void)[] = [];

export function startRequest() {
  activeRequests += 1;
  notify();
}

export function endRequest() {
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
}

function notify() {
  for (const l of listeners) {
    l(activeRequests);
  }
}

export function subscribeToLoader(fn: (active: number) => void) {
  listeners.push(fn);
  // unsubscribe function
  return () => {
    listeners = listeners.filter((x) => x !== fn);
  };
}
