const db = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const emailService = require('./emailService');

let schedulerInterval = null;

/**
 * Checks for users eligible for daily expense reminders at the specified or current time.
 */
async function processRemindersForTime(targetTimeStr) {
  try {
    const timeStr =
      targetTimeStr ||
      new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

    // Query active users with reminders enabled whose configured time matches
    const userRes = await db.query(
      `SELECT user_id, name, email, expense_reminder_time
       FROM users
       WHERE expense_reminder_enabled = TRUE
         AND (
           expense_reminder_time = $1
           OR (expense_reminder_time IS NULL AND $1 = '21:00')
         )`,
      [timeStr]
    );

    const eligibleUsers = userRes.rows;
    if (eligibleUsers.length === 0) return { count: 0 };

    let remindersSent = 0;

    for (const user of eligibleUsers) {
      // Check if user already recorded expenses today
      const expRes = await db.query(
        `SELECT 1 FROM expenses WHERE user_id = $1 AND expense_date = CURRENT_DATE LIMIT 1`,
        [user.user_id]
      );
      if (expRes.rows.length > 0) {
        // User already logged expenses today, no need to nag
        continue;
      }

      // Check if notification already delivered today
      const notifRes = await db.query(
        `SELECT 1 FROM notifications
         WHERE user_id = $1
           AND notification_type = 'DAILY_REMINDER'
           AND created_at >= CURRENT_DATE
         LIMIT 1`,
        [user.user_id]
      );
      if (notifRes.rows.length > 0) {
        continue;
      }

      // 1. Deliver In-App Notification
      await notificationRepository.createIfMissing({
        userId: user.user_id,
        title: 'Daily Expense Check-in 📝',
        message: `Hi ${user.name || 'there'}! It's ${user.expense_reminder_time || '21:00'} — take a moment to record today's purchases so your budget remains on track.`,
        notificationType: 'DAILY_REMINDER',
      });

      // 2. Deliver Email Nudge
      if (user.email) {
        await emailService.sendDailyExpenseReminder({
          email: user.email,
          name: user.name,
          reminderTime: user.expense_reminder_time || '9:00 PM',
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
async function triggerDailyRemindersNow() {
  try {
    const userRes = await db.query(
      `SELECT user_id, name, email, expense_reminder_time
       FROM users
       WHERE expense_reminder_enabled = TRUE`
    );

    let remindersSent = 0;

    for (const user of userRes.rows) {
      // 1. In-App Notification
      await notificationRepository.createIfMissing({
        userId: user.user_id,
        title: 'Daily Expense Check-in 📝',
        message: `Hi ${user.name || 'there'}! Take a moment to record today's purchases so your budget and insights stay up to date.`,
        notificationType: 'DAILY_REMINDER',
      });

      // 2. Email Nudge
      if (user.email) {
        await emailService.sendDailyExpenseReminder({
          email: user.email,
          name: user.name,
          reminderTime: user.expense_reminder_time || '9:00 PM',
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

  console.log('[ReminderScheduler] Daily expense reminder scheduler started (60s tick).');
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
};
