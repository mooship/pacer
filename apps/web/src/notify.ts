import { type ComputeResult, fmtMoney } from '@pacer/core';
import { readStorage, writeStorage } from './storage.js';

/** `localStorage` key for the "notify me on payout day" preference. */
export const NOTIFY_KEY = 'pacer.notify';
/** `localStorage` key recording the last day a payout notification was shown, to dedupe repeats. */
const NOTIFIED_KEY = 'pacer.notifiedDate';

/** Reads the persisted notification preference; `false` if unset or unreadable. */
export function loadNotifyEnabled(): boolean {
  return readStorage(NOTIFY_KEY) === '1';
}

function persistNotifyEnabled(enabled: boolean): void {
  writeStorage(NOTIFY_KEY, enabled ? '1' : null);
}

/**
 * Turns the payout-day notification preference on or off. Turning it on
 * requests browser permission first (a no-op if already granted or denied);
 * the preference only ends up persisted as enabled if permission is
 * actually granted. Returns the resulting enabled state.
 */
export async function setNotifyEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled || typeof Notification === 'undefined') {
    persistNotifyEnabled(false);
    return false;
  }
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  const granted = permission === 'granted';
  persistNotifyEnabled(granted);
  return granted;
}

function alreadyNotifiedToday(day: number): boolean {
  return readStorage(NOTIFIED_KEY) === String(day);
}

function markNotifiedToday(day: number): void {
  writeStorage(NOTIFIED_KEY, String(day));
}

/**
 * Shows a foreground browser notification if `today` is one of `result`'s
 * payout dates, notifications are enabled and permitted, and today's
 * payout hasn't already been notified. This relies on the `Notification`
 * API directly rather than a service worker, so it only fires while the
 * tab/app is open — there is no background delivery.
 */
export function notifyIfDue(
  result: ComputeResult,
  today: number,
  enabled: boolean,
  currency: string,
): boolean {
  if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }
  const idx = result.dates.indexOf(today);
  if (idx === -1 || alreadyNotifiedToday(today)) {
    return false;
  }
  markNotifiedToday(today);
  new Notification('Pacer', { body: `Today's payout: ${fmtMoney(result.amounts[idx], currency)}` });
  return true;
}
