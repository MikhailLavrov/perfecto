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
  const moveForwardRef = useRef(false);

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
      camera.position.set(10, 10, 20);

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
      dirLight.position.set(5, 10, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

    document.addEventListener("keydown", (event) => {
      if (event.code === 'KeyW') { 
        moveForwardRef.current = true;
      };
    });
    document.addEventListener("keyup", (event) => {
      if (event.code === 'KeyW') { 
        moveForwardRef.current = false;
      };
    });

    // === АНИМАЦИЯ ===
    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();
      world.step(1 / 60); // Обновляем физику

      if (fox && foxBody) {
        fox.position.copy(foxBody.position);
        fox.position.y -= 1; // сделал чуть ниже к поверхности

        if (moveForwardRef.current) { 
          const forward = new CANNON.Vec3(0, 0, 3);
          
          foxBody.velocity.x = forward.x * 10;
          foxBody.velocity.z = forward.z * 5;
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

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // const [fontSize, setFontSize] = useState(14)

  return (
    <>
      {/* <div className='text'>
        <input
          type="range"
          name="sdf"
          min={10}
          max={40}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
        <span style={{fontSize: `${fontSize}px`}}>Текст тут, все тут</span>
        <button
          type="reset"
          onClick={() => setFontSize(14)}
        >
          Сбросить
        </button>
      </div> */}
      <div ref={mountRef} />
    </>
  );
}

export default App;
