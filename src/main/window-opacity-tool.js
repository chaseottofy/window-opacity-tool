class WindowOpacityTool {
  constructor() {
    this.main = document.querySelector('main');
    this.opacityRange = this.main.querySelector('#input-opacity');
    this.inputOnTop = this.main.querySelector('[data-control="ontop"]');
    this.inputFullscreen = this.main.querySelector('[data-control="fullscreen"]');
    this.state = {
      opacity: 100,
      isOnTop: false,
      isFullscreen: false,
    };
  }

  setDisabled(status) {
    this.opacityRange.disabled = status;
    this.inputOnTop.disabled = status;
    this.inputFullscreen.disabled = status;
  }

  resetState() {
    this.setOpacity(100);
    this.state = {
      opacity: 100,
      isOnTop: false,
      isFullscreen: false,
    };
    this.toggleFullscreen();
    this.toggleOnTop();
  }

  setOpacity(value) {
    if (value > 0 && value <= 100 && value !== this.state.opacity) {
      this.opacityRange.value = value;
      this.handleOpacity(
        this.opacityRange.closest('.control-wrapper'),
        this.opacityRange,
      );
    }
  }

  toggleOnTop() {
    if (this.inputOnTop.disabled === false) {
      this.state.isOnTop = !this.state.isOnTop;
      this.handleCheckbox(this.inputOnTop);
    }
  }

  toggleFullscreen() {
    if (this.inputOnTop.inputFullscreen === false) {
      this.state.isFullscreen = !this.state.isFullscreen;
      this.handleCheckbox(this.inputFullscreen);
    }
  }

  getOpacity() {
    return Number.parseFloat((this.state.opacity / 100).toFixed(2));
  }

  getOnTop() { return this.state.isOnTop; }

  handleOpacity(wrapper, target) {
    const { value, dataset } = target;
    const { label = null } = dataset;
    this.state.opacity = value;
    if (label) {
      const labelElement = wrapper.querySelector(`#${label}`);
      const { style } = labelElement;
      style.transform = `translateX(-${value}%)`;
      style.left = `${value}%`;
      labelElement.textContent = value;
    }
  }

  handleCheckbox(updater) {
    const { control = null } = updater.dataset;
    if (control) {
      const label = updater.querySelector('label');
      this.state[control] = !this.state[control];
      label.dataset.hasCheck = this.state[control];
    }
  }
}

module.exports = WindowOpacityTool;
