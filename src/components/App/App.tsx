import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAnimal } from '../Animal/Animal';
import { createGround } from '../Ground/Ground';

const controlsParams = {
  zoomSpeed: 1.0,
  rotateSpeed: 0.5,
  keyPanSpeed: 7.0,
  mousePanSpeed: 0.5,
  mouseZoomSpeed: 0.5,
  minPolarAngle: THREE.MathUtils.degToRad(15),
  maxPolarAngle: THREE.MathUtils.degToRad(75),
  minDistance: 20,
  maxDistance: 40,
  enablePan: false,
};

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // === ФИЗИЧЕСКИЙ МИР ===
    const world = new CANNON.World();
      world.gravity.set(0, -9.82, 0); // Гравитация вниз

    // === THREE.JS СЦЕНА ===
    const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);

    // Камера
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
      camera.position.set(10, 10, 20); // Начальная позиция камеры

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);

    // Контролы
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, controlsParams);

    // === ЗЕМЛЯ ===
    const [ground, groundBody] = createGround();
    scene.add(ground);
    world.addBody(groundBody);

    // === ЛИСА (ASYNC) ===
    let fox: THREE.Object3D | null = null;
    let foxBody: CANNON.Body | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let walkAction: THREE.AnimationAction | null = null;
    let isWalking: boolean;

    createAnimal().then(([loadedFox, loadedFoxBody, loadedWalkAction]) => {
      fox = loadedFox;
      foxBody = loadedFoxBody;
      if (loadedWalkAction) {
        walkAction = loadedWalkAction;
      }
      if (loadedWalkAction) {
        mixer = loadedWalkAction.getMixer();
        loadedWalkAction.play();
        loadedWalkAction.paused = true;
      }
      scene.add(fox);
      world.addBody(loadedFoxBody);
    });

    // === СВЕТ ===
    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 5, 0);
    dirLight.castShadow = true;
    scene.add(dirLight);

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -1000;
    dirLight.shadow.camera.right = 1000;
    dirLight.shadow.camera.top = 1000;
    dirLight.shadow.camera.bottom = -1000;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;

      // === КЛАВИАТУРА ===
    let objDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    let pressedKeys = new Set<any>();

    let targetRotationY = 0; // поворот тела

    const updateDirections = () => {
      let directionX = 0, directionZ = 0;
      
      if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
        directionZ += 3;
        targetRotationY = 0;
      };
      if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
        directionZ -= 3;
        targetRotationY = -3.1;
      };
      if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
        directionX += 3;
        targetRotationY = 1.6;
      };
      if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
        directionX -= 3;
        targetRotationY = -1.6;
      };
      if (pressedKeys.has('KeyW') && pressedKeys.has('KeyA')) {
        targetRotationY = 0.7;
      };
      if (pressedKeys.has('KeyW') && pressedKeys.has('KeyD')) {
        targetRotationY = -0.7;
      };
      if (pressedKeys.has('KeyS') && pressedKeys.has('KeyD')) {
        targetRotationY = -2.4;
      };
      if (pressedKeys.has('KeyS') && pressedKeys.has('KeyA')) {
        targetRotationY = 2.4;
      };

      objDirection.set(directionX, 0, directionZ)
    }

    document.addEventListener("keydown", (event) => {
      pressedKeys.add(event.code);
      updateDirections()
      isWalking = true;
    });
    document.addEventListener("keyup", (event) => {
      if (pressedKeys.delete(event.code))
      updateDirections()
      isWalking = false;
    });

     // === АНИМАЦИЯ ===
    const animate = () => {
      requestAnimationFrame(animate);
      if (mixer) {
        mixer.update(0.016); // примерно 60 FPS
      }
      controls.update();
      world.step(1 / 60); // Обновляем физику

      if (fox && foxBody) {
        fox.position.copy(foxBody.position);
        fox.position.y = 0;

        fox.rotation.y = THREE.MathUtils.lerp(fox.rotation.y, targetRotationY, 0.1)

        // Включаем анимацию во время движения
        if (isWalking && walkAction) {
          walkAction.paused = false;
        } else if (!isWalking && walkAction) {
          walkAction.paused = true;
        }
// !TODO необходимо для более плавного начала/конца анимации, но initial scale тупит
        // if (isWalking && walkAction) {
        //   if (!walkAction.isRunning()) {
        //     walkAction.reset();
        //     walkAction.fadeIn(0.3).play(); // Плавный запуск анимации
        //   }
        // } else if (!isWalking && walkAction) {
        //   walkAction.fadeOut(0.5).stop(); // Плавное завершение
        // }        

        if (objDirection.length() > 0) {
          foxBody.velocity.set(objDirection.x * 5, objDirection.y * 5, objDirection.z * 5)
        } else {
          foxBody.velocity.x *= 0.9;
          foxBody.velocity.z *= 0.9;
        }

        controls.target.set(fox.position.x, fox.position.y + 10, fox.position.z - 4);
      }

      renderer.render(scene, camera);
    };
    animate();

    // === ОБРАБОТЧИК РАЗМЕРА ОКНА ===
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div ref={mountRef} />
    </>
  );
}

export default App;
