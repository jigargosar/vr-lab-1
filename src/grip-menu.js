const WHEEL_RADIUS = 0.08;
const ITEM_RADIUS = 0.02;
const FOLLOW_FACTOR = 0.1;
const POSITION_DEAD_ZONE = 0.002;
const ROTATION_DEAD_ZONE = 0.01;

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

export function createGripMenu(config = {}) {
  const group = new THREE.Group();
  group.visible = false;

  let selectedColorIndex = 0;
  let currentPosition = new THREE.Vector3();
  let currentQuaternion = new THREE.Quaternion();
  let velocity = new THREE.Vector3();

  // Create color spheres in a ring
  const colorSpheres = [];
  COLORS.forEach((color, i) => {
    const angle = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * WHEEL_RADIUS;
    const y = Math.sin(angle) * WHEEL_RADIUS;

    const geometry = new THREE.SphereGeometry(ITEM_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, 0);
    sphere.userData.color = color;
    sphere.userData.index = i;
    colorSpheres.push(sphere);
    group.add(sphere);
  });

  // Create selection indicator arrow at top pointing down
  const arrowGroup = new THREE.Group();
  const arrowLength = 0.03;
  const arrowWidth = 0.015;

  // Arrow body (cone pointing down)
  const coneGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
  const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.rotation.x = Math.PI; // Point downward
  cone.position.set(0, WHEEL_RADIUS + arrowLength / 2 + 0.01, 0);
  arrowGroup.add(cone);

  group.add(arrowGroup);

  function show() {
    group.visible = true;
  }

  function hide() {
    group.visible = false;
  }

  function update(targetPosition, targetQuaternion) {
    if (!group.visible) return;

    // Position: exponential decay with dead zone
    const positionDelta = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = positionDelta.length();

    if (distance > POSITION_DEAD_ZONE) {
      velocity.copy(positionDelta).multiplyScalar(FOLLOW_FACTOR);
      currentPosition.add(velocity);
    }
    // If within dead zone, stop moving (velocity stays zero)

    // Rotation: slerp with dead zone
    const angleDiff = currentQuaternion.angleTo(targetQuaternion);

    if (angleDiff > ROTATION_DEAD_ZONE) {
      currentQuaternion.slerp(targetQuaternion, FOLLOW_FACTOR);
    }
    // If within dead zone, stop rotating

    // Apply to group
    group.position.copy(currentPosition);
    group.quaternion.copy(currentQuaternion);
  }

  function getColor() {
    return COLORS[selectedColorIndex];
  }

  function setSelectedIndex(index) {
    selectedColorIndex = index;
  }

  function destroy() {
    colorSpheres.forEach(sphere => {
      sphere.geometry.dispose();
      sphere.material.dispose();
    });
    arrowGroup.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  return {
    group,
    show,
    hide,
    update,
    getColor,
    setSelectedIndex,
    destroy
  };
}
