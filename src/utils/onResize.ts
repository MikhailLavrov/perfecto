import * as THREE from 'three';

// Обработчик изменения размера экрана
export const onResize = (renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) => {
  const onResizeEvent = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  return window.addEventListener("resize", onResizeEvent);
}
