const WHEEL_RADIUS = 0.08;
const ITEM_RADIUS = 0.02;
const FOLLOW_FACTOR = 0.1;
const POSITION_DEAD_ZONE = 0.002;
const ROTATION_DEAD_ZONE = 0.01;

// Spin mechanics
const SPIN_INPUT_DEAD_ZONE = 0;
const SPIN_MAX_VELOCITY = 0.08;
const SPIN_SMOOTHING = 0.15;

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

  // Spin state
  let wheelAngle = 0;
  let wheelVelocity = 0;
  let lastDisplayedIndex = 0;
  let visualAngle = 0;
  const VISUAL_LERP = 0.25;
  const wheelGroup = new THREE.Group();

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
    wheelGroup.add(sphere);
  });

  group.add(wheelGroup);

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

  function update(targetPosition, targetQuaternion, spinInput = 0) {
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

    // Spin mechanics: joystick position -> fixed speed
    let targetSpeed = 0;
    if (Math.abs(spinInput) > SPIN_INPUT_DEAD_ZONE) {
      targetSpeed = spinInput * SPIN_MAX_VELOCITY;
    }

    // Lerp to new speed (smooth speed changes only)
    wheelVelocity += (targetSpeed - wheelVelocity) * SPIN_SMOOTHING;

    // Update internal angle at current speed
    wheelAngle += wheelVelocity;

    // Calculate target snap position (discrete)
    const colorCount = COLORS.length;
    const anglePerColor = (Math.PI * 2) / colorCount;
    let normalizedAngle = ((-wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const displayedIndex = Math.floor((normalizedAngle + anglePerColor / 2) / anglePerColor) % colorCount;
    const targetSnapAngle = -displayedIndex * anglePerColor;

    // Lerp visual toward snap position (smooth movement, snaps into place)
    let delta = targetSnapAngle - visualAngle;
    // Normalize to shortest path
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    visualAngle += delta * VISUAL_LERP;
    wheelGroup.rotation.z = visualAngle;

    // Update selected color and track change for haptics
    selectedColorIndex = displayedIndex;
    const indexChanged = displayedIndex !== lastDisplayedIndex;
    lastDisplayedIndex = displayedIndex;

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
