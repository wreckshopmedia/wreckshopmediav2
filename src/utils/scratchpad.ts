/**
 * @description console.log that only fires on localhost - drop-in replacement for
 * any log you want silenced in production. Supports %c styling, multiple args,
 * objects, all of it. Just swap console.log → scratchpad() and forget about it.
 * @author Chris "Mo" Mochinski
 */
export function scratchpad(...args: Parameters<typeof console.log>): void {
  if (window.location.hostname.includes('localhost')) {
    console.log(...args)
  }
}
