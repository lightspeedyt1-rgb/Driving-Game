/**
 * OPEN ROAD FESTIVAL - Input Manager
 * Keyboard, Gamepad API, and Touch virtual buttons.
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.rawSteer = 0;
    this.rawThrottle = 0;
    this.rawBrake = 0;
    this.rawHandbrake = false;
    this.rawNitro = false;

    // Action triggers (single pulse)
    this.resetPressed = false;
    this.cameraPressed = false;
    this.mapPressed = false;
    this.pausePressed = false;
    this.garagePressed = false;
    this.interactPressed = false;

    // Touch button states
    this.touchSteerLeft = false;
    this.touchSteerRight = false;
    this.touchThrottle = false;
    this.touchBrake = false;
    this.touchHandbrake = false;
    this.touchNitro = false;

    this.gamepadConnected = false;

    this.initKeyboard();
    this.initGamepad();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Pulse actions
      if (e.code === 'KeyR') this.resetPressed = true;
      if (e.code === 'KeyC') this.cameraPressed = true;
      if (e.code === 'KeyM') this.mapPressed = true;
      if (e.code === 'Escape') this.pausePressed = true;
      if (e.code === 'KeyG') this.garagePressed = true;
      if (e.code === 'KeyE' || e.code === 'Enter') this.interactPressed = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  initGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      console.log("Gamepad connected:", e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
    });
  }

  initTouch() {
    // Detect mobile touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const tc = document.getElementById('touch-controls');
      if (tc) tc.style.display = 'block';

      this.bindTouch('touch-steer-left', val => this.touchSteerLeft = val);
      this.bindTouch('touch-steer-right', val => this.touchSteerRight = val);
      this.bindTouch('touch-throttle', val => this.touchThrottle = val);
      this.bindTouch('touch-brake', val => this.touchBrake = val);
      this.bindTouch('touch-handbrake', val => this.touchHandbrake = val);
      this.bindTouch('touch-nitro', val => this.touchNitro = val);

      const btnReset = document.getElementById('touch-reset');
      if (btnReset) btnReset.addEventListener('touchstart', () => this.resetPressed = true);

      const btnCam = document.getElementById('touch-cam');
      if (btnCam) btnCam.addEventListener('touchstart', () => this.cameraPressed = true);
    }
  }

  bindTouch(elemId, callback) {
    const el = document.getElementById(elemId);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); callback(true); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); callback(false); }, { passive: false });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); callback(false); }, { passive: false });
  }

  poll() {
    // Keyboard inputs
    let steer = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchSteerLeft) steer -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchSteerRight) steer += 1;

    let throttle = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchThrottle) throttle = 1;

    let brake = 0;
    if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchBrake) brake = 1;

    let handbrake = this.keys['Space'] || this.touchHandbrake;
    let nitro = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchNitro;

    // Gamepad inputs
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      // Left stick X
      if (Math.abs(gp.axes[0]) > 0.15) {
        steer = gp.axes[0];
      }

      // Triggers (RT: 7, LT: 6)
      if (gp.buttons[7]) throttle = Math.max(throttle, gp.buttons[7].value);
      if (gp.buttons[6]) brake = Math.max(brake, gp.buttons[6].value);

      // Handbrake (A / Cross button 0)
      if (gp.buttons[0] && gp.buttons[0].pressed) handbrake = true;

      // Nitro (B / Circle button 1)
      if (gp.buttons[1] && gp.buttons[1].pressed) nitro = true;

      // Camera (X / Square button 2)
      if (gp.buttons[2] && gp.buttons[2].pressed && !this._prevGpX) {
        this.cameraPressed = true;
      }
      this._prevGpX = gp.buttons[2]?.pressed;

      // Reset (Y / Triangle button 3)
      if (gp.buttons[3] && gp.buttons[3].pressed && !this._prevGpY) {
        this.resetPressed = true;
      }
      this._prevGpY = gp.buttons[3]?.pressed;

      // Start / Pause (button 9)
      if (gp.buttons[9] && gp.buttons[9].pressed && !this._prevGpStart) {
        this.pausePressed = true;
      }
      this._prevGpStart = gp.buttons[9]?.pressed;
    }

    return {
      steer: steer,
      throttle: throttle,
      brake: brake,
      handbrake: handbrake,
      nitro: nitro,
      reset: this.consumeReset(),
      camera: this.consumeCamera(),
      map: this.consumeMap(),
      pause: this.consumePause(),
      garage: this.consumeGarage(),
      interact: this.consumeInteract()
    };
  }

  consumeReset() { const val = this.resetPressed; this.resetPressed = false; return val; }
  consumeCamera() { const val = this.cameraPressed; this.cameraPressed = false; return val; }
  consumeMap() { const val = this.mapPressed; this.mapPressed = false; return val; }
  consumePause() { const val = this.pausePressed; this.pausePressed = false; return val; }
  consumeGarage() { const val = this.garagePressed; this.garagePressed = false; return val; }
  consumeInteract() { const val = this.interactPressed; this.interactPressed = false; return val; }
}
