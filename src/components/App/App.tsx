import { useEffect, useRef, useState } from 'react';
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

const groundBodyParams = {
  mass: 0, // 0 = неподвижный объект
  shape: new CANNON.Plane(),
  position: new CANNON.Vec3(0, 0, 0),
};

const foxBodyParams = {
  mass: 5,
  shape: new CANNON.Sphere(1), // Можно заменить на Box для лучшей коллизии
  position: new CANNON.Vec3(0, 2, 0),
}

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
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.0007);

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
    const ground = createGround();
    scene.add(ground);

    // === ФИЗИЧЕСКАЯ ЗЕМЛЯ ===
    const groundBody = new CANNON.Body(groundBodyParams);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Горизонтальная поверхность
    world.addBody(groundBody);

    // === ЛИСА (ASYNC) ===
    let fox: THREE.Object3D | null = null;
    let foxBody: CANNON.Body | null = null;

    createAnimal().then((loadedFox) => {
      fox = loadedFox;
      scene.add(fox);

      foxBody = new CANNON.Body(foxBodyParams);

      world.addBody(foxBody);
    });

    // === СВЕТ ===
    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 5, 0);
    dirLight.castShadow = true;
    scene.add(dirLight);

    dirLight.shadow.mapSize.width = 2048; // качество
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

    let targetRotationY = 0;
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
    });
    document.addEventListener("keyup", (event) => {
      if (pressedKeys.delete(event.code))
      updateDirections()
    });

     // === АНИМАЦИЯ ===
    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();
      world.step(1 / 60); // Обновляем физику

      if (fox && foxBody) {
        fox.position.copy(foxBody.position);
        fox.position.y -= 1; // сделал чуть ниже к поверхности

        fox.rotation.y = THREE.MathUtils.lerp(fox.rotation.y, targetRotationY, 0.1)

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

  const [fontSize, setFontSize] = useState(14)

  return (
    <>
      <div className='text'>
        <input
          type="range"
          name="sdf"
          min={10}
          max={40}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
        <span style={{fontSize: `${fontSize}px`}}>Текст тsdcdsут, все тут</span>
        <button
          type="reset"
          onClick={() => setFontSize(14)}
        >
          Сбросить
        </button>
      </div>
      <div ref={mountRef} />
    </>
  );
}

export default App;
