class StrHelper {
  static CString(str) {
    if (str) {
      return Buffer.from(`${str}\0`, 'ucs2');
    }
    return null;
  }

  /*
  Reverses order of window name if it contains a hypen
  'X - Home - Google Chrome' -> 'Google Chrome - Home - X'
  */
  static formatWindowName(windowName) {
    if (/-/.test(windowName)) {
      return windowName.split('-').reverse().join(' - ').trim();
    }

    return windowName;
  }
}

module.exports = StrHelper;
