const ffi = require('@lwahonen/ffi-napi');

const StrHelper = require('./str-helper');
const handleIgnorePatterns = require('./ignore-patterns');

class WindowTracker {
  constructor() {
    this.activeWindows = new Set();
    this.activeWindowsMap = new Map();
    this.lastActiveWindow = null;
    this.isTracking = false;
    this.documentTitle = null;
    this.electronWindowHwnd = null;

    this.UPDATE_INTERVAL = 1000;
    this.GWL_EXSTYLE = -20;
    this.WS_EX_LAYERED = 0x8_00_00;
    this.LWA_ALPHA = 0x2;
    this.SW_MAXIMIZE = 3;
    this.SW_RESTORE = 9;
    this.GA_ROOT = 2;
    this.MIN_OPACITY = 50;

    this.user32 = new ffi.Library('user32', {
      BringWindowToTop: ['bool', ['pointer']],

      FindWindowExW: ['pointer', ['pointer', 'pointer', 'pointer', 'pointer']],
      FindWindowW: ['pointer', ['string', 'string']],

      GetAncestor: ['pointer', ['pointer', 'uint']],
      GetClassNameW: ['int', ['pointer', 'pointer', 'int']],
      GetDesktopWindow: ['pointer', []],
      GetForegroundWindow: ['pointer', []],
      GetParent: ['pointer', ['pointer']],

      GetWindowRect: ['bool', ['pointer', 'pointer']],

      GetWindowTextA: ['int32', ['pointer', 'pointer', 'int32']],
      GetWindowTextW: ['int32', ['pointer', 'pointer', 'int32']],
      GetWindowTextLengthW: ['int32', ['pointer']],
      GetWindowLongW: ['long', ['pointer', 'int']],

      IsIconic: ['bool', ['pointer']],
      IsWindow: ['bool', ['pointer']],
      IsWindowVisible: ['bool', ['pointer']],

      SetLayeredWindowAttributes: ['bool', ['pointer', 'ulong', 'uchar', 'ulong']],
      SetWindowLongW: ['long', ['pointer', 'int', 'long']],
      ShowWindow: ['bool', ['pointer', 'int']],

      // toggle forced on top
      SetWindowPos: ['bool', ['pointer', 'pointer', 'int', 'int', 'int', 'int', 'uint']],
    });
  }

  setDocumentTitle(title) {
    this.documentTitle = title;
    this.electronWindowHwnd = this.getHwnd(title);
  }

  getTrackedWindows() {
    return [...this.activeWindows];
  }

  getHwnd(windowTitle) {
    if (this.activeWindowsMap.has(windowTitle)) {
      return this.activeWindowsMap.get(windowTitle);
    }
    return this.user32.FindWindowExW(
      this.user32.GetDesktopWindow(),
      null,
      null,
      StrHelper.CString(windowTitle),
    );
  }

  async toggleWindowOntop(windowTitle, isOnTop) {
    try {
      const hwnd = this.getHwnd(windowTitle);
      if (hwnd && !hwnd.isNull()) {
        const flags = isOnTop ? 0x1 | 0x2 : 0x1 | 0x4;
        this.user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, flags);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling window on top:', error);
      return false;
    }
  }

  async maximizeWindow(windowTitle) {
    try {
      const hwnd = this.getHwnd(windowTitle);
      if (hwnd && !hwnd.isNull()) {
        const isMinimized = this.user32.IsIconic(hwnd);
        if (isMinimized) {
          const success = this.user32.ShowWindow(hwnd, this.SW_MAXIMIZE);
          return success;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error maximizing window:', error);
      return false;
    }
  }

  async setWindowOpacity(windowTitle, opacity) {
    try {
      const hwnd = this.user32.FindWindowW(null, Buffer.from(`${windowTitle}\0`, 'ucs2'));
      if (hwnd) {
        // this.user32.ShowWindow(hwnd, this.SW_RESTORE);
        this.user32.BringWindowToTop(hwnd);
        let style = this.user32.GetWindowLongW(hwnd, this.GWL_EXSTYLE);
        if ((style & this.WS_EX_LAYERED) === 0) {
          style |= this.WS_EX_LAYERED;
          this.user32.SetWindowLongW(hwnd, this.GWL_EXSTYLE, style);
        }
        this.user32.SetLayeredWindowAttributes(
          hwnd,
          0,
          Math.max(Math.floor(opacity * 255), this.MIN_OPACITY),
          this.LWA_ALPHA,
        );
        return true;
      }
    } catch (error) {
      console.error('Error setting window opacity:', error);
    }
    return false;
  }

  getForegroundWindowTitle() {
    try {
      const hwnd = this.user32.GetForegroundWindow();
      if (hwnd.isNull()) return null;
      const bufferSize = 256;
      const buffer = Buffer.alloc(bufferSize * 2);
      const length = this.user32.GetWindowTextW(hwnd, buffer, bufferSize);
      if (length > 0) {
        return buffer.toString('utf16le').slice(0, Math.max(0, length)).trim();
      }
      return null;
    } catch (error) {
      console.error('Error getting window title:', error);
      return null;
    }
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.checkActiveWindow();
  }

  stopTracking() {
    this.isTracking = false;
    console.log('Stopped tracking windows');
  }

  checkActiveWindow() {
    if (!this.isTracking) return;
    const currentWindow = this.getForegroundWindowTitle();
    if ((currentWindow && currentWindow !== this.lastActiveWindow)
      && (handleIgnorePatterns(currentWindow) === false)) {
      this.activeWindows.add(currentWindow);
      this.lastActiveWindow = currentWindow;
    }
    setTimeout(() => this.checkActiveWindow(), this.UPDATE_INTERVAL);
  }

  clearTrackedWindows() {
    if (this.activeWindows.size > 0) {
      for (const window of this.activeWindows) {
        this.setWindowOpacity(window, 1);
      }
    }
    this.activeWindows.clear();
    this.activeWindowsMap.clear();
    this.lastActiveWindow = null;
  }

  removeTrackedWindow(windowTitle) {
    if (this.lastActiveWindow === windowTitle) this.lastActiveWindow = null;
    this.activeWindows.delete(windowTitle);
    this.activeWindowsMap.delete(windowTitle);
  }
}

module.exports = WindowTracker;
