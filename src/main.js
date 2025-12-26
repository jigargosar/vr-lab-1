import 'aframe';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

const LINE_WIDTH = 10;
const LINE_COLOR = 0xff66aa;

AFRAME.registerComponent('paint-controls', {
  init: function () {
    this.isDrawing = false;
    this.currentLine = null;
    this.geometry = null;
    this.positions = [];
    this.lastPos = null;
    this.strokes = [];

    this.el.addEventListener('triggerdown', () => this.startDrawing());
    this.el.addEventListener('triggerup', () => this.stopDrawing());
    this.el.addEventListener('abuttondown', () => this.clearAll());
    this.el.addEventListener('xbuttondown', () => this.clearAll());
  },

  clearAll: function () {
    const scene = this.el.sceneEl.object3D;
    this.strokes.forEach(line => scene.remove(line));
    this.strokes = [];
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
    this.el.sceneEl.object3D.add(this.currentLine);
    this.strokes.push(this.currentLine);
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

    if (!this.lastPos || this.lastPos.distanceTo(worldPos) > 0.005) {
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