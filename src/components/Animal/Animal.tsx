import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelPATH = '/models/low_poly_fox_by_pixelmannen_animated/scene.gltf';

export const createAnimal = async (): Promise<[THREE.Object3D, CANNON.Body, THREE.AnimationAction?, THREE.AnimationAction?]> => {
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

      let walkAction: THREE.AnimationAction | undefined;
      let idleAction: THREE.AnimationAction | undefined;

      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(fox);
        const originalClip = gltf.animations[0];
        const walkClip = THREE.AnimationUtils.subclip(originalClip, 'walk', 250, 315);
        const idleClip = THREE.AnimationUtils.subclip(originalClip, 'idle', 15, 115);
        walkAction = mixer.clipAction(walkClip);
        idleAction = mixer.clipAction(idleClip);
      }

      const foxBody = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        position: new CANNON.Vec3(0, 2, 0),
      });

      resolve([fox, foxBody, walkAction, idleAction]);
    }, undefined, (error) => {
      console.error("Ошибка загрузки модели:", error);
      reject(error);
    });
  });
};
