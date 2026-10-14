// Minimal UA parser — gives us enough to render "Chrome on Windows" without
// pulling in a 100KB dependency. We only consume browser + OS labels in the
// Sessions list; precise versioning isn't needed for security UX.

export function parseUserAgent(ua) {
  if (!ua || typeof ua !== "string") {
    return { browser: "Unknown browser", os: "Unknown device" };
  }

  let browser = "Unknown browser";
  // Order matters: Edge/Opera identify themselves as Chrome too, so they
  // have to be matched first.
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";

  let os = "Unknown device";
  if (/Windows NT 10/i.test(ua)) os = "Windows";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, os };
}

// "5 minutes ago", "2 hours ago", etc. Falls back to absolute date for
// anything older than ~6 days.
export function relativeTime(input) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);

  if (sec < 60) return "just now";
  if (sec < 3600) {
    const m = Math.round(sec / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  }
  if (sec < 86400) {
    const h = Math.round(sec / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  if (sec < 86400 * 6) {
    const d = Math.round(sec / 86400);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}
