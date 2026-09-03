import { type ComputeResult, compute, defaultConfig } from '@pacer/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNotifyEnabled, NOTIFY_KEY, notifyIfDue, setNotifyEnabled } from './notify.js';

function makeResult(): ComputeResult {
  const r = compute(100, 130, 500000, defaultConfig());
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadNotifyEnabled', () => {
  it('is false when nothing is stored', () => {
    expect(loadNotifyEnabled()).toBe(false);
  });

  it('is true when the flag is set', () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    expect(loadNotifyEnabled()).toBe(true);
  });

  it('is false if reading storage throws', () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(loadNotifyEnabled()).toBe(false);
  });
});

describe('setNotifyEnabled', () => {
  it('clears the preference when disabling', async () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    const granted = await setNotifyEnabled(false);
    expect(granted).toBe(false);
    expect(localStorage.getItem(NOTIFY_KEY)).toBeNull();
  });

  it('is false when the browser has no Notification API', async () => {
    vi.stubGlobal('Notification', undefined);
    const granted = await setNotifyEnabled(true);
    expect(granted).toBe(false);
    expect(localStorage.getItem(NOTIFY_KEY)).toBeNull();
  });

  it('requests permission and persists when granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const granted = await setNotifyEnabled(true);
    expect(granted).toBe(true);
    expect(localStorage.getItem(NOTIFY_KEY)).toBe('1');
  });

  it('does not persist when permission is denied', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    const granted = await setNotifyEnabled(true);
    expect(granted).toBe(false);
    expect(localStorage.getItem(NOTIFY_KEY)).toBeNull();
  });

  it('skips the permission prompt when already granted', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
    const granted = await setNotifyEnabled(true);
    expect(granted).toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('skips the permission prompt when already denied', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission });
    const granted = await setNotifyEnabled(true);
    expect(granted).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe('notifyIfDue', () => {
  function grantedNotification() {
    const ctor = vi.fn();
    vi.stubGlobal(
      'Notification',
      Object.assign(ctor, { permission: 'granted' as NotificationPermission }),
    );
    return ctor;
  }

  it('does nothing when disabled', () => {
    const ctor = grantedNotification();
    expect(notifyIfDue(makeResult(), 100, false, 'USD')).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });

  it('does nothing without the Notification API', () => {
    vi.stubGlobal('Notification', undefined);
    expect(notifyIfDue(makeResult(), 100, true, 'USD')).toBe(false);
  });

  it('does nothing when permission is not granted', () => {
    const ctor = vi.fn();
    vi.stubGlobal(
      'Notification',
      Object.assign(ctor, { permission: 'denied' as NotificationPermission }),
    );
    expect(notifyIfDue(makeResult(), 100, true, 'USD')).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });

  it('does nothing when today is not a payout date', () => {
    const ctor = grantedNotification();
    expect(notifyIfDue(makeResult(), 105, true, 'USD')).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });

  it('fires a notification on a payout day and dedupes on repeat calls', () => {
    const ctor = grantedNotification();
    const r = makeResult();
    expect(notifyIfDue(r, 100, true, 'USD')).toBe(true);
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith('Pacer', {
      body: `Today's payout: $${(r.amounts[0] / 100).toFixed(2)}`,
    });

    expect(notifyIfDue(r, 100, true, 'USD')).toBe(false);
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it('still fires if marking the notified date fails', () => {
    const ctor = grantedNotification();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(notifyIfDue(makeResult(), 100, true, 'USD')).toBe(true);
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it('treats a storage read failure as not-yet-notified', () => {
    const ctor = grantedNotification();
    localStorage.setItem('pacer.notifiedDate', '100');
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(notifyIfDue(makeResult(), 100, true, 'USD')).toBe(true);
    expect(ctor).toHaveBeenCalledTimes(1);
  });
});
