const IGNORE_CONSTANTS = new Set([
  'f-automation-proj', // title of app
  'task switching', // alt tabbing triggers temp container
  'snap assist', // windows snap assist triggers temp container
]);

const IGNORE_PATTERNS = [
  (title) => title.startsWith('electron'),
  (title) => title.endsWith('visual studio code'),
  (title) => IGNORE_CONSTANTS.has(title),
];

const handleIgnorePatterns = (title) => {
  const tstTitle = title.toLowerCase().trim();
  return IGNORE_PATTERNS.some((pattern) => pattern(tstTitle));
};

module.exports = handleIgnorePatterns;
