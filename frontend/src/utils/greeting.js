/**
 * Dynamic time-based greeting utility for Indian Standard Time (IST - Asia/Kolkata).
 * Evaluates the time in the 'Asia/Kolkata' timezone regardless of client device timezone.
 *
 * IST Schedule:
 * - 05:00 AM – 11:59 AM: Good Morning
 * - 12:00 PM – 04:59 PM: Good Afternoon
 * - 05:00 PM – 08:59 PM: Good Evening
 * - 09:00 PM – 04:59 AM: Good Evening
 */
export function getTimeBasedGreeting(arg1, arg2) {
  let date = new Date();
  let name = '';

  if (arg1 instanceof Date) {
    date = arg1;
  } else if (typeof arg1 === 'string') {
    name = arg1.trim();
    if (arg2 instanceof Date) {
      date = arg2;
    }
  }

  let hour = 12; // safe fallback
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    });
    const parsed = parseInt(formatter.format(date), 10);
    if (!isNaN(parsed)) {
      hour = parsed % 24;
    }
  } catch (err) {
    // Fallback calculation: UTC + 5.5 hours
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 5.5 * 3600000);
    hour = istTime.getHours();
  }

  let salutation = 'Good Evening';

  if (hour >= 5 && hour < 12) {
    salutation = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    salutation = 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    salutation = 'Good Evening';
  } else {
    salutation = 'Good Evening';
  }

  return name ? `${salutation}, ${name}` : salutation;
}
