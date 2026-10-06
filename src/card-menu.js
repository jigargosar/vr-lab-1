// Card menu - eye-aligned grid with spatial selection
const CARD_SIZE = 0.15;
const CELL_SIZE = CARD_SIZE / 3;
const CELL_GAP = 0.005;
const OFFSET_ABOVE_CONTROLLER = 0.1;
const MIN_DISTANCE_FROM_EYE = 0.3;
const FOLLOW_FACTOR = 0.15;
const SELECTION_DEAD_ZONE = 0.02;
const SELECTION_SENSITIVITY = 8;

const COLORS = [
  0xff0000, // Red
  0xff8800, // Orange
  0xffff00, // Yellow
  0x00ff00, // Green
  0x0088ff, // Blue
  0x8800ff, // Purple
  0xffffff, // White
  0x222222, // Black
  0xff66aa  // Pink (center/default)
];

export function createCardMenu(config = {}) {
  const group = new THREE.Group();
  group.visible = false;

  let selectedIndex = 4; // Center
  let currentPosition = new THREE.Vector3();
  let anchorPosition = new THREE.Vector3();
  const cells = [];

  // Create 3x3 grid of color cells
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const color = COLORS[index];

      const size = CELL_SIZE - CELL_GAP;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide
      });
      const cell = new THREE.Mesh(geometry, material);

      // Position in grid (centered)
      const x = (col - 1) * CELL_SIZE;
      const y = (1 - row) * CELL_SIZE; // Flip Y so row 0 is top
      cell.position.set(x, y, 0);

      cell.userData.color = color;
      cell.userData.index = index;
      cell.userData.row = row;
      cell.userData.col = col;
      cells.push(cell);
      group.add(cell);
    }
  }

  // Selection highlight
  const highlightGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.z = 0.001; // Slightly in front
  group.add(highlight);

  function updateHighlight() {
    const row = Math.floor(selectedIndex / 3);
    const col = selectedIndex % 3;
    const x = (col - 1) * CELL_SIZE;
    const y = (1 - row) * CELL_SIZE;
    highlight.position.x = x;
    highlight.position.y = y;
  }

  function show(controllerPos, cameraPos) {
    // Anchor at controller position
    anchorPosition.copy(controllerPos);

    // Position card above controller, toward camera
    const toCamera = new THREE.Vector3().subVectors(cameraPos, controllerPos).normalize();
    const cardPos = controllerPos.clone().add(
      new THREE.Vector3(0, OFFSET_ABOVE_CONTROLLER, 0)
    );

    // Ensure minimum distance from eye
    const distToEye = cardPos.distanceTo(cameraPos);
    if (distToEye < MIN_DISTANCE_FROM_EYE) {
      const pushBack = toCamera.clone().multiplyScalar(MIN_DISTANCE_FROM_EYE - distToEye);
      cardPos.sub(pushBack);
    }

    currentPosition.copy(cardPos);
    group.position.copy(cardPos);

    // Face camera
    group.lookAt(cameraPos);

    selectedIndex = 4; // Reset to center
    updateHighlight();
    group.visible = true;
  }

  function hide() {
    group.visible = false;
  }

  function update(controllerPos, cameraPos) {
    if (!group.visible) return;

    // Card stays fixed - no following

    // Selection based on controller offset from anchor
    const offset = new THREE.Vector3().subVectors(controllerPos, anchorPosition);

    // Project offset onto card's local XY plane
    const cardRight = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion);
    const cardUp = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);

    const localX = offset.dot(cardRight);
    const localY = offset.dot(cardUp);

    // Map to grid selection with dead zone
    let col = 1; // Center
    let row = 1; // Center

    if (Math.abs(localX) > SELECTION_DEAD_ZONE) {
      const xOffset = Math.round(localX * SELECTION_SENSITIVITY);
      col = Math.max(0, Math.min(2, 1 + xOffset));
    }

    if (Math.abs(localY) > SELECTION_DEAD_ZONE) {
      const yOffset = Math.round(localY * SELECTION_SENSITIVITY);
      row = Math.max(0, Math.min(2, 1 - yOffset)); // Invert Y
    }

    const newIndex = row * 3 + col;
    if (newIndex !== selectedIndex) {
      selectedIndex = newIndex;
      updateHighlight();
    }
  }

  function getColor() {
    return COLORS[selectedIndex];
  }

  function getSelectedIndex() {
    return selectedIndex;
  }

  function destroy() {
    cells.forEach(cell => {
      cell.geometry.dispose();
      cell.material.dispose();
    });
    highlight.geometry.dispose();
    highlight.material.dispose();
  }

  return {
    group,
    show,
    hide,
    update,
    getColor,
    getSelectedIndex,
    destroy
  };
}
