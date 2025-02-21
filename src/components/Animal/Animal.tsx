import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelPATH = '/models/low_poly_fox_by_pixelmannen_animated/scene.gltf';

export const createAnimal = async (): Promise<THREE.Object3D> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(modelPATH, (gltf) => {
      const fox = gltf.scene;

      fox.scale.set(0.1, 0.1, 0.1);
      fox.rotation.set(-0.05, 0, 0);
      fox.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
        }
      });

      // Запуск анимации
      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(fox);
        const action = mixer.clipAction(gltf.animations[0]); 
        action.play();

        const clock = new THREE.Clock(); 
        const animate = () => {
          requestAnimationFrame(animate);
          mixer.update(clock.getDelta());
        };
        animate();
      }

      resolve(fox);
    }, undefined, (error) => {
      console.error("Ошибка загрузки модели:", error);
      reject(error);
    });
  });
};
