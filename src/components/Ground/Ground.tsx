import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const groundTextureURL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHu2c3n9E-pugiVSZJirRk20BOh_J9KuNhnw&s';

export const createGround = (): [THREE.Mesh, CANNON.Body] => {
  // Геометрия
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    groundGeometry.rotateX(-Math.PI / 2);
  
  // Текстура
  const groundTexture = new THREE.TextureLoader().load(groundTextureURL);
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(80, 80);
  
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });

  // Mesh (Three.js объект)
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    ground.position.set(0, 0, 0);

  // Физическое тело (Cannon.js)
  const groundBody = new CANNON.Body({
    mass: 0, // 0 = неподвижный объект
    shape: new CANNON.Plane(),
  });

  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Горизонтальная поверхность
  groundBody.position.set(0, 0, 0); // Устанавливаем позицию

  return [ground, groundBody];
}
