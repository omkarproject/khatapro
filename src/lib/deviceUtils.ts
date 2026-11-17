/**
 * Utility functions for client-side device identification and user-agent metadata parsing.
 */

export interface DeviceMetadata {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
}

const DEVICE_ID_KEY = 'skp_device_id';

/**
 * Returns the persistent unique device ID for this browser profile, or generates one.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.trim().length === 0) {
      id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev_tmp_${Date.now()}`;
  }
}

/**
 * Parses user agent string and browser environment into friendly device metadata.
 */
export function detectDeviceMetadata(): DeviceMetadata {
  const deviceId = getOrCreateDeviceId();
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceId,
      deviceName: 'Web Browser',
      deviceType: 'desktop',
      browser: 'Web',
      os: 'Unknown',
    };
  }

  const ua = navigator.userAgent || '';

  // 1. Detect OS
  let os = 'Unknown OS';
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';

  if (/iPad|tablet/i.test(ua)) {
    deviceType = 'tablet';
    os = 'iPadOS';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    const match = ua.match(/OS (\d+[_\d]*)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Android/i.test(ua)) {
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
    const match = ua.match(/Android\s+([\d.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    os = 'macOS';
  } else if (/Windows NT 10.0/i.test(ua)) {
    deviceType = 'desktop';
    // Windows 11 uses NT 10.0 too, but we can display Windows 11/10
    os = 'Windows 11 / 10';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Windows';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'desktop';
    os = 'ChromeOS';
  }

  // 2. Detect Browser
  let browser = 'Browser';
  if (/Edg\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/i);
    browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge';
  } else if (/OPR\/|Opera\//i.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/i);
    browser = match ? `Opera ${match[1].split('.')[0]}` : 'Opera';
  } else if (/SamsungBrowser\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/SamsungBrowser\/([\d.]+)/i);
    browser = match ? `Samsung Internet ${match[1].split('.')[0]}` : 'Samsung Internet';
  } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/i);
    browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
  } else if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/i);
    browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/i);
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
  }

  // 3. Compose friendly device name
  let deviceBase = 'Computer';
  if (deviceType === 'mobile') {
    if (os.startsWith('iOS')) deviceBase = 'iPhone';
    else deviceBase = 'Mobile Phone';
  } else if (deviceType === 'tablet') {
    if (os.startsWith('iPad')) deviceBase = 'iPad';
    else deviceBase = 'Tablet';
  } else {
    if (os.startsWith('Windows')) deviceBase = 'Windows PC';
    else if (os.startsWith('macOS')) deviceBase = 'Mac';
    else if (os.startsWith('Linux')) deviceBase = 'Linux PC';
    else deviceBase = 'Desktop PC';
  }

  const deviceName = `${deviceBase} • ${browser}`;

  return {
    deviceId,
    deviceName,
    deviceType,
    browser,
    os,
  };
}

/**
 * Formats last active timestamp into relative or human-readable format.
 */
export function formatLastActive(isoDate?: string): string {
  if (!isoDate) return 'Just now';
  try {
    const time = new Date(isoDate).getTime();
    if (isNaN(time)) return 'Active now';
    const diff = Math.floor((Date.now() - time) / 1000);

    if (diff < 45) return 'Active now';
    if (diff < 120) return '1 min ago';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }

    const d = new Date(time);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}
