// app-title: window-opacity-tool
const { ipcRenderer } = require('electron');
const WindowOpacityTool = require('../main/window-opacity-tool');
const formatWindowTitle = require('../main/format-title');
const { colors } = require('../main/constants');

document.addEventListener('DOMContentLoaded', () => {
  const opacityTool = new WindowOpacityTool();
  const NO_TITLE = 'N/A';
  const UPDATE_INTERVAL = 500;
  const cmp = new Map();
  let prevTracked = new Set();
  let isTracking = false;
  let currentSelectedWindow = null;

  const main = document.querySelector('main');
  const startButton = document.querySelector('#start-tracking');
  const stopButton = document.querySelector('#stop-tracking');
  const clearButton = document.querySelector('#clear-windows');
  const windowTitleElement = main.querySelector('#window-title');
  const opacityRange = main.querySelector('#input-opacity');
  const resetOpacityRangeButton = main.querySelector('[data-control="reset-opacity"]');
  const windowList = document.querySelector('#window-list');
  const deleteSvg = document.querySelector('#delete-svg');

  const toggleUpdates = (key, flg) => {
    ipcRenderer.send(key);
    isTracking = flg;
    startButton.disabled = isTracking;
    stopButton.disabled = !isTracking;
  };

  const handleReset = () => {
    if (currentSelectedWindow) {
      ipcRenderer.invoke('set-window-opacity', currentSelectedWindow, 1);
    }
    currentSelectedWindow = null;
    windowTitleElement.textContent = NO_TITLE;
    opacityTool.resetState();
  };

  const handleToggle = (e) => {
    const { target } = e;
    const { id, dataset } = target;
    const { trackingFlg } = dataset;
    toggleUpdates(id, trackingFlg === 'true');
  };

  const createListItem = (window) => {
    const listWrapper = document.createElement('div');
    listWrapper.classList.add('list-wrapper');

    const wFrm = formatWindowTitle(window);
    const prf = wFrm.slice(0, Math.min(8, wFrm.length));
    if (cmp.has(prf) === false) {
      cmp.set(prf, colors[cmp.size % colors.length]);
    }

    const listItem = document.createElement('li');
    const groupColor = cmp.get(prf) || 'transparent';
    listItem.style.borderColor = groupColor;
    listItem.style.backgroundColor = groupColor;
    listItem.textContent = wFrm;
    if (window === currentSelectedWindow) listItem.classList.add('selected');

    const deleteButton = document.createElement('button');
    deleteButton.style.borderColor = groupColor;
    deleteButton.append(deleteSvg.cloneNode(true));
    listWrapper.append(listItem, deleteButton);

    deleteButton.addEventListener('click', async () => {
      try {
        if (window === currentSelectedWindow) {
          await ipcRenderer.invoke('set-window-opacity', window, 1);
          currentSelectedWindow = null;
          windowTitleElement.textContent = NO_TITLE;
        }
        opacityTool.resetState();
        prevTracked.delete(window);
        ipcRenderer.send('remove-tracked-window', window);
        listWrapper.remove();
        if (windowList.children.length === 0) {
          toggleUpdates('stop-tracking', false);
          clearButton.disabled = true;
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });

    listItem.addEventListener('click', async () => {
      try {
        if (window === currentSelectedWindow) {
          listItem.classList.remove('selected');
          await ipcRenderer.invoke('set-window-opacity', window, 1);
          currentSelectedWindow = null;
          windowTitleElement.textContent = NO_TITLE;
          opacityTool.resetState();
        } else {
          const prev = document.querySelector('.selected');
          if (prev) prev.classList.remove('selected');
          if (currentSelectedWindow) {
            await ipcRenderer.invoke('set-window-opacity', currentSelectedWindow, 1);
          }
          await ipcRenderer.invoke(
            'set-window-opacity',
            window,
            opacityTool.getOpacity(),
          );
          listItem.classList.add('selected');
          windowTitleElement.textContent = wFrm;
          currentSelectedWindow = window;
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
    return listWrapper;
  };

  opacityRange.addEventListener('input', async (e) => {
    const { value } = e.target;
    if (currentSelectedWindow) {
      await ipcRenderer.invoke('set-window-opacity', currentSelectedWindow, value / 100);
    }
    opacityTool.setOpacity(value);
  });

  resetOpacityRangeButton.addEventListener('click', () => {
    opacityTool.resetState();
    if (currentSelectedWindow) {
      ipcRenderer.invoke('set-window-opacity', currentSelectedWindow, 1);
    }
  });

  startButton.addEventListener('click', handleToggle);
  stopButton.addEventListener('click', handleToggle);
  clearButton.addEventListener('click', async () => {
    ipcRenderer.send('clear-tracked-windows');
    ipcRenderer.send('reset-window-opacity');
    toggleUpdates('stop-tracking', false);
    handleReset();
    prevTracked.clear();
    currentSelectedWindow = null;
    clearButton.disabled = true;
    opacityTool.resetState();
    while (windowList.firstChild) windowList.firstChild.remove();
  });

  async function updateWindowList() {
    if (!isTracking) return;
    const trackedWindows = await ipcRenderer.invoke('get-tracked-windows');
    if (trackedWindows.length === 0) {
      clearButton.disabled = true;
      return;
    }
    clearButton.disabled = false;
    if (trackedWindows.length !== prevTracked.size) {
      for (const window of trackedWindows) {
        if (prevTracked.has(window)) {
          prevTracked.delete(window);
        } else {
          windowList.append(createListItem(window));
        }
      }

      if (prevTracked.size > 0) {
        for (const window of prevTracked) {
          const item = document.querySelector(`li:contains(${window})`);
          if (item) item.remove();
        }
      }
      prevTracked.clear();
      prevTracked = new Set(trackedWindows);
    }
  }

  ipcRenderer.send('set-document-title', document.title);
  setInterval(updateWindowList, UPDATE_INTERVAL);
  toggleUpdates('start-tracking', true);
});
