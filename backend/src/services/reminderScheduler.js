const db = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const emailService = require('./emailService');

let schedulerInterval = null;

/**
 * Returns { localTime: 'HH:mm', localDate: 'YYYY-MM-DD' } for a given IANA timezone.
 */
function getUserLocalTime(timezoneStr) {
  const tz = timezoneStr || 'Asia/Kolkata';
  const now = new Date();

  try {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const localTime = timeFormatter.format(now);

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const localDate = dateFormatter.format(now); // 'YYYY-MM-DD'

    return { localTime, localDate };
  } catch (err) {
    // Fallback to UTC/Asia/Kolkata if timezone string is invalid
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return {
      localTime: timeFormatter.format(now),
      localDate: dateFormatter.format(now),
    };
  }
}

/**
 * Normalize time format to HH:mm (e.g. "21:00:00" -> "21:00")
 */
function normalizeTime(timeVal) {
  if (!timeVal) return '21:00';
  const str = String(timeVal).trim();
  const parts = str.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Checks for users eligible for daily expense reminders at their local time.
 * Can be run every minute by the scheduler or triggered directly in tests.
 */
async function processRemindersForTime(forcedTargetTime = null, specificUserId = null) {
  try {
    let query = `
      SELECT user_id, name, email, expense_reminder_time, timezone
      FROM users
      WHERE expense_reminder_enabled = TRUE
    `;
    const params = [];

    if (specificUserId) {
      params.push(specificUserId);
      query += ` AND user_id = $1`;
    }

    const userRes = await db.query(query, params);
    const eligibleUsers = userRes.rows;
    if (eligibleUsers.length === 0) return { count: 0 };

    let remindersSent = 0;

    for (const user of eligibleUsers) {
      const { localTime, localDate } = getUserLocalTime(user.timezone);
      const configuredTime = normalizeTime(user.expense_reminder_time);

      // If checking routinely, compare configured time to user's local time (or forced target time)
      const currentTarget = forcedTargetTime ? normalizeTime(forcedTargetTime) : localTime;
      if (configuredTime !== currentTarget) {
        continue;
      }

      // Check if user already recorded an expense today in their local date
      const expRes = await db.query(
        `SELECT 1 FROM expenses WHERE user_id = $1 AND expense_date = $2 LIMIT 1`,
        [user.user_id, localDate]
      );
      if (expRes.rows.length > 0) {
        // User already entered expenses today!
        continue;
      }

      // Atomically check & log delivery to guarantee idempotency across concurrent instances
      const logRes = await db.query(
        `INSERT INTO reminder_delivery_logs (user_id, scheduled_time, delivery_date, channel, status)
         VALUES ($1, $2, $3, 'IN_APP', 'DELIVERED')
         ON CONFLICT (user_id, delivery_date, channel) DO NOTHING
         RETURNING log_id`,
        [user.user_id, configuredTime, localDate]
      );

      if (logRes.rows.length === 0) {
        // Already delivered today by this or another instance
        continue;
      }

      // 1. Deliver In-App Notification with clickable link to /expenses
      await notificationRepository.createIfMissing({
        userId: user.user_id,
        title: 'Daily Expense Check-in 📝',
        message: `Hi ${user.name || 'there'}! It's ${configuredTime} — take a moment to record today's purchases so your budget and insights stay up to date.`,
        notificationType: 'DAILY_REMINDER',
        link: '/expenses',
      });

      // 2. Deliver Email Nudge
      if (user.email) {
        await emailService.sendDailyExpenseReminder({
          email: user.email,
          name: user.name,
          reminderTime: configuredTime,
        }).catch((err) => {
          console.warn(`[ReminderScheduler] Failed sending email to ${user.email}:`, err.message);
        });
      }

      remindersSent += 1;
    }

    return { count: remindersSent };
  } catch (err) {
    console.error('[ReminderScheduler] Error running reminder sweep:', err.message);
    return { count: 0, error: err.message };
  }
}

/**
 * Manually trigger reminders for all users with reminders enabled regardless of exact minute.
 * Useful for automated verification and admin health-checks.
 */
async function triggerDailyRemindersNow(specificUserId = null) {
  try {
    let query = `
      SELECT user_id, name, email, expense_reminder_time, timezone
      FROM users
      WHERE expense_reminder_enabled = TRUE
    `;
    const params = [];

    if (specificUserId) {
      params.push(specificUserId);
      query += ` AND user_id = $1`;
    }

    const userRes = await db.query(query, params);
    let remindersSent = 0;

    for (const user of userRes.rows) {
      const { localTime, localDate } = getUserLocalTime(user.timezone);
      const configuredTime = normalizeTime(user.expense_reminder_time);

      // Check if user already recorded an expense today
      const expRes = await db.query(
        `SELECT 1 FROM expenses WHERE user_id = $1 AND expense_date = $2 LIMIT 1`,
        [user.user_id, localDate]
      );
      if (expRes.rows.length > 0) {
        continue;
      }

      const logRes = await db.query(
        `INSERT INTO reminder_delivery_logs (user_id, scheduled_time, delivery_date, channel, status)
         VALUES ($1, $2, $3, 'IN_APP', 'DELIVERED')
         ON CONFLICT (user_id, delivery_date, channel) DO NOTHING
         RETURNING log_id`,
        [user.user_id, configuredTime, localDate]
      );

      if (logRes.rows.length === 0) {
        continue;
      }

      await notificationRepository.createIfMissing({
        userId: user.user_id,
        title: 'Daily Expense Check-in 📝',
        message: `Hi ${user.name || 'there'}! Take a moment to record today's purchases so your budget and insights stay up to date.`,
        notificationType: 'DAILY_REMINDER',
        link: '/expenses',
      });

      if (user.email) {
        await emailService.sendDailyExpenseReminder({
          email: user.email,
          name: user.name,
          reminderTime: configuredTime,
        }).catch(() => null);
      }

      remindersSent += 1;
    }

    return { success: true, count: remindersSent };
  } catch (err) {
    console.error('[ReminderScheduler] Manual trigger failed:', err.message);
    return { success: false, error: err.message };
  }
}

function startReminderScheduler() {
  if (schedulerInterval) return;

  // Run initial check after 10s, then once every minute
  setTimeout(() => {
    processRemindersForTime().catch(() => null);
  }, 10000);

  schedulerInterval = setInterval(() => {
    processRemindersForTime().catch(() => null);
  }, 60000);

  console.log('[ReminderScheduler] Daily expense reminder scheduler started (60s tick, timezone-aware).');
}

function stopReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
  processRemindersForTime,
  triggerDailyRemindersNow,
  getUserLocalTime,
  normalizeTime,
};
