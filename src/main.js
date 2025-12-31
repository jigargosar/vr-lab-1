import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';

async function setupXREmulation() {
  const nativeVR = navigator.xr
    ? await navigator.xr.isSessionSupported('immersive-vr')
    : false;

  if (!nativeVR) {
    const xrDevice = new XRDevice(metaQuest3);
    xrDevice.ipd = 0;
    xrDevice.installRuntime();
    xrDevice.installDevUI(DevUI);
    console.log('IWER emulation active');
  } else {
    console.log('Native VR available, skipping IWER');
  }
}

// await setupXREmulation();

// Dynamic import to ensure IWER is installed before A-Frame loads
await import('aframe');
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

const DEFAULT_LINE_WIDTH = 10;
const MIN_LINE_WIDTH = 2;
const MAX_LINE_WIDTH = 40;
const DEFAULT_COLOR = 0xff66aa;
const ERASER_COLOR = 0x888888;
const INDICATOR_REST_Z = -0.12;
const INDICATOR_MENU_Z = -0.25;
const ANIMATION_DURATION = 200;

const COLORS = [
  0xff0000, // Red
  0xff8800, // Orange
  0xffff00, // Yellow
  0x00ff00, // Green
  0x0088ff, // Blue
  0x8800ff, // Purple
  0xffffff, // White
  0x222222  // Black
];

// Shared stroke manager - attached to scene
AFRAME.registerComponent('stroke-manager', {
  init: function () {
    this.strokes = [];
  },

  addStroke: function (stroke) {
    this.strokes.push(stroke);
    this.el.object3D.add(stroke);
  },

  undoStroke: function () {
    if (this.strokes.length === 0) return;
    const stroke = this.strokes.pop();
    this.el.object3D.remove(stroke);
    stroke.geometry.dispose();
    stroke.material.dispose();
  },

  clearAll: function () {
    this.strokes.forEach(stroke => {
      this.el.object3D.remove(stroke);
      stroke.geometry.dispose();
      stroke.material.dispose();
    });
    this.strokes = [];
  }
});

AFRAME.registerComponent('paint-controls', {
  init: function () {
    this.isDrawing = false;
    this.currentLine = null;
    this.geometry = null;
    this.positions = [];
    this.lastPos = null;
    this.currentColor = DEFAULT_COLOR;
    this.lineWidth = DEFAULT_LINE_WIDTH;
    this.colorMenu = null;
    this.colorMenuVisible = false;
    this.eraserMode = false;
    this.indicator = null;
    this.indicatorAnimating = false;
    this.indicatorAnimStart = 0;
    this.indicatorAnimFrom = INDICATOR_REST_Z;
    this.indicatorAnimTo = INDICATOR_REST_Z;

    this.el.addEventListener('triggerdown', () => this.onTriggerDown());
    this.el.addEventListener('triggerup', () => this.onTriggerUp());
    this.el.addEventListener('abuttondown', () => this.clearAll());
    this.el.addEventListener('xbuttondown', () => this.clearAll());
    this.el.addEventListener('bbuttondown', () => this.undo());
    this.el.addEventListener('ybuttondown', () => this.undo());
    this.el.addEventListener('gripdown', () => this.showColorMenu());
    this.el.addEventListener('gripup', () => this.hideColorMenu());
    this.el.addEventListener('thumbstickmoved', (e) => this.onThumbstick(e));
    this.el.addEventListener('thumbstickdown', () => this.toggleEraser());

    this.createColorMenu();
    this.createIndicator();
  },

  createIndicator: function () {
    const radius = this.lineWidth / 2000;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.currentColor });
    this.indicator = new THREE.Mesh(geometry, material);
    this.indicator.position.set(0, 0, -0.12);
    this.el.object3D.add(this.indicator);
  },

  updateIndicator: function () {
    if (!this.indicator) return;
    const color = this.eraserMode ? ERASER_COLOR : this.currentColor;
    this.indicator.material.color.setHex(color);
    const baseRadius = DEFAULT_LINE_WIDTH / 2000;
    const targetRadius = this.lineWidth / 2000;
    const scale = targetRadius / baseRadius;
    this.indicator.scale.setScalar(scale);
  },

  onThumbstick: function (e) {
    const y = e.detail.y;
    if (Math.abs(y) > 0.5) {
      this.lineWidth += y > 0 ? -1 : 1;
      this.lineWidth = Math.max(MIN_LINE_WIDTH, Math.min(MAX_LINE_WIDTH, this.lineWidth));
      this.updateIndicator();
    }
  },

  onTriggerDown: function () {
    if (this.eraserMode) {
      this.eraseAtPosition();
    } else {
      this.startDrawing();
    }
  },

  onTriggerUp: function () {
    if (!this.eraserMode) {
      this.stopDrawing();
    }
  },

  eraseAtPosition: function () {
    const worldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPos);
    const manager = this.getStrokeManager();
    const eraseRadius = 0.1;

    for (let i = manager.strokes.length - 1; i >= 0; i--) {
      const stroke = manager.strokes[i];
      const box = new THREE.Box3().setFromObject(stroke);
      if (box.distanceToPoint(worldPos) < eraseRadius) {
        manager.strokes.splice(i, 1);
        manager.el.object3D.remove(stroke);
        stroke.geometry.dispose();
        stroke.material.dispose();
        break;
      }
    }
  },

  createColorMenu: function () {
    this.colorMenu = new THREE.Group();
    const radius = 0.08;
    const itemRadius = 0.02;

    COLORS.forEach((color, i) => {
      const angle = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const geometry = new THREE.SphereGeometry(itemRadius, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, 0);
      sphere.userData.color = color;
      this.colorMenu.add(sphere);
    });

    this.colorMenu.visible = false;
    this.el.object3D.add(this.colorMenu);
  },

  showColorMenu: function () {
    if (this.isDrawing) return;
    this.colorMenu.visible = true;
    this.colorMenuVisible = true;
    this.startIndicatorAnimation(INDICATOR_MENU_Z);
  },

  hideColorMenu: function () {
    if (!this.colorMenuVisible) return;
    this.colorMenu.visible = false;
    this.colorMenuVisible = false;
    this.startIndicatorAnimation(INDICATOR_REST_Z);

    // Find closest color to controller forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.el.object3D.quaternion);

    let closestColor = this.currentColor;
    let closestDot = -Infinity;

    this.colorMenu.children.forEach(sphere => {
      const dir = sphere.position.clone().normalize();
      const dot = forward.dot(dir);
      if (dot > closestDot) {
        closestDot = dot;
        closestColor = sphere.userData.color;
      }
    });

    if (closestDot > 0.5) {
      this.currentColor = closestColor;
      this.updateIndicator();
    }
  },

  toggleEraser: function () {
    this.eraserMode = !this.eraserMode;
    this.updateIndicator();
  },

  startIndicatorAnimation: function (targetZ) {
    this.indicatorAnimating = true;
    this.indicatorAnimStart = performance.now();
    this.indicatorAnimFrom = this.indicator.position.z;
    this.indicatorAnimTo = targetZ;
  },

  updateIndicatorAnimation: function () {
    if (!this.indicatorAnimating || !this.indicator) return;
    const elapsed = performance.now() - this.indicatorAnimStart;
    const t = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = t * (2 - t);
    this.indicator.position.z = this.indicatorAnimFrom + (this.indicatorAnimTo - this.indicatorAnimFrom) * eased;
    if (t >= 1) {
      this.indicatorAnimating = false;
    }
  },

  getStrokeManager: function () {
    return this.el.sceneEl.components['stroke-manager'];
  },

  clearAll: function () {
    this.getStrokeManager().clearAll();
  },

  undo: function () {
    this.getStrokeManager().undoStroke();
  },

  startDrawing: function () {
    this.isDrawing = true;
    this.positions = [];
    this.lastPos = null;

    this.geometry = new LineGeometry();

    const material = new LineMaterial({
      color: this.currentColor,
      linewidth: this.lineWidth / 1000,
      worldUnits: true
    });

    this.currentLine = new Line2(this.geometry, material);
    this.getStrokeManager().addStroke(this.currentLine);
  },

  stopDrawing: function () {
    this.isDrawing = false;
    this.currentLine = null;
    this.geometry = null;
    this.positions = [];
    this.lastPos = null;
  },

  tick: function () {
    this.updateIndicatorAnimation();

    if (!this.isDrawing || !this.currentLine) return;

    const worldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPos);
    const forward = new THREE.Vector3(0, 0, INDICATOR_REST_Z);
    forward.applyQuaternion(this.el.object3D.quaternion);
    worldPos.add(forward);

    if (!this.lastPos || this.lastPos.distanceTo(worldPos) > 0.002) {
      this.positions.push(worldPos.x, worldPos.y, worldPos.z);

      if (this.positions.length >= 6) {
        this.geometry.dispose();
        this.geometry = new LineGeometry();
        this.geometry.setPositions(this.positions);
        this.currentLine.geometry = this.geometry;
        this.currentLine.computeLineDistances();
      }

      this.lastPos = worldPos.clone();
    }
  }
});