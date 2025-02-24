import * as THREE from 'three';

const groundTextureURL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHu2c3n9E-pugiVSZJirRk20BOh_J9KuNhnw&s';
// const groundTextureURL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMZFRtbW9h7xzFwkp8gieRHrDEdVIKVeHOUw&s';

export const createGround = () => {
  // Геометрия
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    groundGeometry.rotateX(-Math.PI / 2);
  
  // Текстура
  const groundTexture = new THREE.TextureLoader().load(groundTextureURL);
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(80, 80);
  
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });

  // Mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    ground.position.set(0, 0, 0);

  return ground;
}
