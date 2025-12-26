import 'aframe';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

console.log('Line2:', Line2);

AFRAME.registerComponent('paint-controls', {
  init: function () {
    this.isDrawing = false;
    this.strokeContainer = null;
    this.lastPos = null;
    this.lineIndex = 0;

    this.el.addEventListener('triggerdown', () => this.startDrawing());
    this.el.addEventListener('triggerup', () => this.stopDrawing());
    this.el.addEventListener('abuttondown', () => this.clearAll());
    this.el.addEventListener('xbuttondown', () => this.clearAll());
  },

  clearAll: function () {
    const strokes = this.el.sceneEl.querySelectorAll('.stroke');
    strokes.forEach(stroke => stroke.parentNode.removeChild(stroke));
  },

  startDrawing: function () {
    this.isDrawing = true;
    this.lastPos = null;
    this.lineIndex = 0;

    this.strokeContainer = document.createElement('a-entity');
    this.strokeContainer.classList.add('stroke');
    this.el.sceneEl.appendChild(this.strokeContainer);
  },

  stopDrawing: function () {
    this.isDrawing = false;
    this.strokeContainer = null;
    this.lastPos = null;
  },

  tick: function () {
    if (!this.isDrawing || !this.strokeContainer) return;

    const worldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPos);

    if (this.lastPos && this.lastPos.distanceTo(worldPos) > 0.005) {
      this.strokeContainer.setAttribute(`line__${this.lineIndex}`, {
        start: `${this.lastPos.x} ${this.lastPos.y} ${this.lastPos.z}`,
        end: `${worldPos.x} ${worldPos.y} ${worldPos.z}`,
        color: '#ff66aa'
      });
      this.lineIndex++;
    }

    this.lastPos = worldPos.clone();
  }
});