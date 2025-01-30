// Add this validator function at the top with other utility functions
const isValidDate = (dateString) => {
  // Check format
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return false;
  }

  const [day, month, year] = dateString
    .split("/")
    .map((num) => parseInt(num, 10));
  const date = new Date(year, month - 1, day);

  // Check if date is valid and not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    date instanceof Date &&
    !isNaN(date) &&
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year &&
    date >= today
  );
};

module.exports = { isValidDate };
