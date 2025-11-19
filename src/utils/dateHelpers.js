/**
 * Date utility functions
 */

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date for relative day (yesterday, today, tomorrow)
 * @param {string} dayString - 'Yesterday', 'Today', or 'Tomorrow'
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function getDateForDay(dayString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dayString === 'Yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  } else if (dayString === 'Today') {
    return formatDate(today);
  } else if (dayString === 'Tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }

  return formatDate(today);
}

/**
 * Get date N days ago
 * @param {number} days - Number of days to go back
 * @returns {Date} Date object
 */
export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get ISO string for date N days ago
 * @param {number} days - Number of days to go back
 * @returns {string} ISO date string
 */
export function getISODaysAgo(days) {
  return getDaysAgo(days).toISOString();
}
