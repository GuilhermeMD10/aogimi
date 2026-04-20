const STORAGE_KEY = 'lgc_device_id';

/** Returns a stable device identifier, generating one on first call. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Best-effort human-readable device name from the User-Agent. */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent;

  // OS detection
  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/Android/.test(ua)) os = 'Android';

  // Browser detection
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}
