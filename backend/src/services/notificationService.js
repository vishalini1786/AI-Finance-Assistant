const notificationRepository = require('../repositories/notificationRepository');

async function getNotifications(userId) {
	const [notifications, unreadCount] = await Promise.all([
		notificationRepository.findAllByUser(userId),
		notificationRepository.countUnread(userId),
	]);
	return { notifications, unreadCount };
}

async function markRead(notificationId, userId) {
	const notification = await notificationRepository.markRead(notificationId, userId);
	if (!notification) {
		const error = new Error('Notification not found');
		error.statusCode = 404;
		error.expose = true;
		throw error;
	}
	return notification;
}

async function markAllRead(userId) {
	await notificationRepository.markAllRead(userId);
	return { success: true };
}

async function notifyBudgetStatus(userId, budget) {
	const utilization = Number(budget.utilization_percent || 0);

	// 80% utilization: Early warning; 100% utilization: Budget exceeded
	if (utilization < 80) return null;

	// Period validation: only alert on the CURRENT calendar month & year
	const now = new Date();
	const currentMonth = now.getMonth() + 1;
	const currentYear = now.getFullYear();
	const bMonth = Number(budget.month);
	const bYear = Number(budget.year);

	if (bMonth !== currentMonth || bYear !== currentYear) {
		return null; // Expired past months or future months must NOT generate notifications
	}

	const budgetId = budget.budget_id;
	const isExceeded = utilization >= 100;

	const title = isExceeded
		? `${budget.category_name} budget exceeded`
		: `${budget.category_name} budget almost exhausted`;

	const remaining = Number(budget.remaining_amount || 0);
	const message = isExceeded
		? `Your ${budget.category_name} budget has been exceeded by ₹${Math.abs(remaining).toFixed(0)}. Consider reviewing your spending.`
		: `Your ${budget.category_name} budget is ${Math.round(utilization)}% utilized — only ₹${Math.max(0, remaining).toFixed(0)} remaining.`;

	const notificationType = isExceeded ? 'BUDGET_EXCEEDED' : 'BUDGET_NEAR_LIMIT';

	return notificationRepository.createBudgetNotificationIfMissing({
		userId,
		title,
		message,
		notificationType,
		budgetId,
		month: bMonth,
		year: bYear,
		link: '/budget',
	});
}

module.exports = { getNotifications, markRead, markAllRead, notifyBudgetStatus };
