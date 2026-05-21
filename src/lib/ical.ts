// Minimal ICS (RFC 5545) writer — single VCALENDAR with N VEVENTs.

export type IcsEvent = {
  uid: string;
  startDate: Date; // all-day events: use UTC midnight
  endDate: Date;   // exclusive (next-day midnight for single-day)
  summary: string;
  location?: string;
  description?: string;
};

function pad(n: number): string { return n.toString().padStart(2, "0"); }
function fmtDate(d: Date): string {
  // YYYYMMDD for VALUE=DATE
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function fmtStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(events: IcsEvent[], prodId = "-//the-trip//roadbook//FR"): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${fmtStamp(now)}`,
      `DTSTART;VALUE=DATE:${fmtDate(e.startDate)}`,
      `DTEND;VALUE=DATE:${fmtDate(e.endDate)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // CRLF per spec.
  return lines.join("\r\n") + "\r\n";
}
