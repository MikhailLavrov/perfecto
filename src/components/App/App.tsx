import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAnimal } from '../Animal/Animal';
import { createGround } from '../Ground/Ground';
import { onResize } from '../../utils/onResize';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

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
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.006);
    
    // === СТАТИСТИКА ===
    const stats = new Stats();
    document.body.appendChild(stats.dom);

    // === КАМЕРА ===
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
      camera.position.set(10, 10, 20); // Начальная позиция камеры

    // === РЕНДЕРЕР ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

    // === КОНТРОЛЫ ===
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, controlsParams);

    // === ЗЕМЛЯ ===
    const geometrySize = 1000;
    const [ground, groundBody] = createGround();
    scene.add(ground);
    world.addBody(groundBody);

    // === ДЕРЕВЬЯ ===
    // !TODO в модели два mesh, соответственно стволы и кроны отдельно при инстансинге
    const loader = new GLTFLoader();
    const treesCount: number = 150;

    loader.load('/models/lowpoly_tree/scene.gltf', (gltf) => {
      let trunk: THREE.Mesh | undefined; // ствол
      let leaves: THREE.Mesh | undefined; // крона
    
      // Ищем ствол и крону
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child.name.includes("Object_4")) {
            trunk = child as THREE.Mesh;
          } else if (child.name.includes("Object_5")) {
            leaves = child as THREE.Mesh;
          }
        }
      });
    
      if (!trunk || !leaves) return;
    
      // инстансы для ствола и кроны
      const trunkInstance = new THREE.InstancedMesh(trunk.geometry, trunk.material, treesCount);
      const leavesInstance = new THREE.InstancedMesh(leaves.geometry, leaves.material, treesCount);
    
      trunkInstance.castShadow = true;
      trunkInstance.receiveShadow = true;
      leavesInstance.castShadow = true;
      leavesInstance.receiveShadow = true;
    
      const treeObject = new THREE.Object3D();
    
      for (let i = 0; i < treesCount; i++) {
        treeObject.position.set(
          Math.random() * geometrySize - geometrySize / 2,
          0,
          Math.random() * geometrySize - geometrySize / 2,
        );
    
        treeObject.rotation.y = Math.random() * Math.PI * 2;
    
        const scale = 5 + Math.random() * 1.5;
        treeObject.scale.set(scale, scale, scale);
    
        treeObject.updateMatrix();
    
        trunkInstance.setMatrixAt(i, treeObject.matrix);
        leavesInstance.setMatrixAt(i, treeObject.matrix);
      }
    
      trunkInstance.instanceMatrix.needsUpdate = true;
      leavesInstance.instanceMatrix.needsUpdate = true;
    
      scene.add(trunkInstance, leavesInstance);
    });    

    // === ЛИСА (ASYNC) ===
    let fox: THREE.Object3D | null = null;
    let foxBody: CANNON.Body | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let walkAction: THREE.AnimationAction | null = null;
    let idleAction: THREE.AnimationAction | null = null;

    createAnimal().then(([loadedFox, loadedFoxBody, loadedWalkAction, loadedIdleAction]) => {
      // Выносим в глобальную среду
      fox = loadedFox;
      foxBody = loadedFoxBody;
      if (loadedIdleAction) idleAction = loadedIdleAction;
      if (loadedWalkAction) walkAction = loadedWalkAction;
      mixer = loadedWalkAction?.getMixer() || idleAction?.getMixer() || null;

      // !TODO надо подумать. Не нравится что лиса хромает. Сочетаются 2 несовместимых экшена.
      // if (loadedIdleAction) {
      //   loadedIdleAction.play()
      //   loadedIdleAction.paused = true;
      // }
      if (loadedWalkAction) {
        loadedWalkAction.play();
        loadedWalkAction.paused = true;
      }
      
      scene.add(fox);
      world.addBody(loadedFoxBody);
    });

    // === СВЕТ ===
    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(0, 5, 0);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.left = -1000;
      dirLight.shadow.camera.right = 1000;
      dirLight.shadow.camera.top = 1000;
      dirLight.shadow.camera.bottom = -1000;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 100;
    scene.add(dirLight);

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

    // === ОБРАБОТЧИКИ КЛАВИАТУР ===
    let timeoutId: any = null;

    const onKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.code);
      updateDirections();
      // Включаем анимацию во время движения
      if (idleAction) idleAction.paused = true;
      if (walkAction) walkAction.paused = false;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (pressedKeys.delete(e.code)) updateDirections();

      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        if (pressedKeys.size === 0) {
          // Выключаем анимацию во время движения с небольшим делеем
          if (idleAction) idleAction.paused = false;
          if (walkAction) walkAction.paused = true;
        }
      }, 300);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
            
    // === АНИМАЦИЯ ===
    let foxbodySpeed: number = 5;
    let slowdownSpeed: number = 0.9;

    const animate = () => {
      requestAnimationFrame(animate);
      stats.begin()
      if (mixer) mixer.update(0.016); // примерно 60 FPS
      controls.update();
      world.step(1 / 60); // Обновляем физику

      if (fox && foxBody) {
        fox.position.copy(foxBody.position);
        fox.position.y = 0;

        fox.rotation.y = THREE.MathUtils.lerp(fox.rotation.y, targetRotationY, 0.1)

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
          foxBody.velocity.set(objDirection.x * foxbodySpeed, objDirection.y * foxbodySpeed, objDirection.z * foxbodySpeed)
        } else {
          foxBody.velocity.x *= slowdownSpeed;
          foxBody.velocity.z *= slowdownSpeed;
        }

        controls.target.set(fox.position.x, fox.position.y + 10, fox.position.z - 4);
      }

      renderer.render(scene, camera);
      stats.end();
    };
    animate();

    // === ОБРАБОТЧИК РАЗМЕРА ОКНА ===
    onResize(renderer, camera);
  }, []);

  return (
    <>
      <div ref={mountRef} />
    </>
  );
}

export default App;
