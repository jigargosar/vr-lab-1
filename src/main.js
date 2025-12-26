import 'aframe';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

const LINE_WIDTH = 10;
const LINE_COLOR = 0xff66aa;

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

    this.el.addEventListener('triggerdown', () => this.startDrawing());
    this.el.addEventListener('triggerup', () => this.stopDrawing());
    this.el.addEventListener('abuttondown', () => this.clearAll());
    this.el.addEventListener('xbuttondown', () => this.clearAll());
    this.el.addEventListener('bbuttondown', () => this.undo());
    this.el.addEventListener('ybuttondown', () => this.undo());
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
      color: LINE_COLOR,
      linewidth: LINE_WIDTH,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
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
    if (!this.isDrawing || !this.currentLine) return;

    const worldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPos);

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