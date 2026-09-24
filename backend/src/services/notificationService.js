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

async function notifyBudgetStatus(userId, budget) {
	const utilization = Number(budget.utilization_percent || 0);
	if (utilization < 80) return null;
	const title = `${budget.category_name} budget ${utilization >= 100 ? 'exceeded' : 'near limit'}`;
	const message = utilization >= 100
		? `${budget.category_name} budget exceeded by ${Math.abs(Number(budget.remaining_amount)).toFixed(2)}.`
		: `${budget.category_name} budget is ${utilization}% utilized.`;
	return notificationRepository.createIfMissing({ userId, title, message, notificationType: 'BUDGET' });
}

module.exports = { getNotifications, markRead, notifyBudgetStatus };
