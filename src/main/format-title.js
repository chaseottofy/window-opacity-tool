const formatWindowTitle = (title) => {
  const nxt = title
    .replaceAll(/^\s+|\s+$/g, '')
    .replaceAll(/\s+/g, ' ');
  return /-/.test(nxt) ? nxt.split('-').reverse().join(' | ') : nxt;
};

module.exports = formatWindowTitle;
