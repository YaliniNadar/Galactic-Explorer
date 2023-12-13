// Imports
import * as THREE from "https://unpkg.com/three@0.156.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.156.1/examples/jsm/controls/OrbitControls.js?module";
import { GLTFLoader } from "https://unpkg.com/three@0.156.1/examples/jsm/loaders/GLTFLoader.js?module";
import { GUI } from "https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js";
import Planet from "./Planet.js";
import { fetchShaderTexts } from './shaderLoader.js';

import { EffectComposer } from "https://unpkg.com/three@0.156.1/examples/jsm/postprocessing/EffectComposer.js?module";
import { RenderPass } from "https://unpkg.com/three@0.156.1/examples/jsm/postprocessing/RenderPass.js?module";
import { UnrealBloomPass } from "https://unpkg.com/three@0.156.1/examples/jsm/postprocessing/UnrealBloomPass.js?module";

const gui = new GUI();

export let shaders = {};
const shaderPaths = {
    haloVertexShader: '../shaders/haloVertex.glsl',
    haloFragmentShader: '../shaders/haloFragment.glsl',
}

// Variables
let container; 	                // keeping the canvas here for easy access

// Spacecraft
let spacecraftSpeed = 0.04;
let spacecraftDirection = new THREE.Vector3();
let spacecraft;

let scene, camera, renderer, composer;    // Core Three.js components: scene graph, viewpoint, and output render
let cameraControls;             // Instance for controlling camera interactions (e.g., zoom, pan).

let cameraTarget = new THREE.Vector3();
let flySpaceship = false;

let EARTH_YEAR = 2 * Math.PI * (1 / 60) * (1 / 60);
let sunMesh, mercurySystem, venusSystem, earthSystem, marsSystem, jupiterSystem, saturnSystem, uranusSystem, neptuneSystem;

let particlesMesh;

//CREATE LIGHTS
export let sunLight;

const loader = new THREE.TextureLoader();
const model_loader = new GLTFLoader().setPath('spaceship/');
let frontLight, midLight;


//GALAXY
const shape = loader.load('../textures/particle_shape.png');
const galaxyPosition = new THREE.Vector3(50, 0, 100);

const GalaxyParameters = {
    count: 70000,
    size : 0.01,
    radius: 7,
    branches: 8,
    spin: 1,
    randomness: 0.3,
    randomnessPower: 5,
    stars: 9000,
    starColor: '#1b3984',
    insideColor: '#ff6030',
    outsideColor: '#1b3984',
}



let geometry = null
let material = null
let points = null


//POST PROCESSING
let bloomIntensity = 0.1;
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.4, 0.85);


function getRandomGalaxyParams() {
    return {
        count: Math.floor(Math.random() * (10000 - 100 + 1)) + 100,
        size: Math.random() * (0.1 - 0.001) + 0.001,
        radius: Math.random() * 4 + 15,
        branches: Math.floor(Math.random() * (10 - 1 + 1)) + 1,
        spin: (Math.random() - 0.5) * 10,
        randomness: Math.random() * 2,
        randomnessPower: Math.floor(Math.random() * (10 - 1 + 1)) + 1,
        insideColor: '#' + Math.floor(Math.random()*16777215).toString(16),
        outsideColor: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
}

function createRandomGalaxy() {
    const randomParams = getRandomGalaxyParams(); // Get random GalaxyParameters

    const randomGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(randomParams.count * 3);
    const colors = new Float32Array(randomParams.count * 3);

    const colorInside = new THREE.Color(randomParams.insideColor);
    const colorOutside = new THREE.Color(randomParams.outsideColor);

    const randomRotationX = Math.random() * Math.PI * 2;
    const randomRotationY = Math.random() * Math.PI * 2;
    const randomRotationZ = Math.random() * Math.PI * 2;


    for (let j = 0; j < randomParams.count; j++) {
        // Position
        const x = Math.random() * randomParams.radius;
        const branchAngle = (j % randomParams.branches) / randomParams.branches * 2 * Math.PI;
        const spinAngle = x * randomParams.spin;

        const randomX = Math.pow(Math.random(), randomParams.randomnessPower) * (Math.random()<0.5 ? 1: -1);
        const randomY = Math.pow(Math.random(), randomParams.randomnessPower) * (Math.random()<0.5 ? 1: -1);
        const randomZ = Math.pow(Math.random(), randomParams.randomnessPower) * (Math.random()<0.5 ? 1: -1);

        positions[j*3] = Math.sin(branchAngle + spinAngle) * x + randomX;
        positions[j*3 + 1] = randomY;
        positions[j*3 + 2] = Math.cos(branchAngle + spinAngle) * x + randomZ;

        // Apply random rotations
        const rotatedPosition = new THREE.Vector3(positions[j*3], positions[j*3 + 1], positions[j*3 + 2]);
        rotatedPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), randomRotationX);
        rotatedPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomRotationY);
        rotatedPosition.applyAxisAngle(new THREE.Vector3(0, 0, 1), randomRotationZ);

        //Color
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, x / GalaxyParameters.radius);

        colors[j*3 + 0] = mixedColor.r;
        colors[j*3 + 1] = mixedColor.g;
        colors[j*3 + 2] = mixedColor.b;
    }

    randomGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    randomGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const randomMaterial = new THREE.PointsMaterial({
        color: 'white',
        size: randomParams.size,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        alphaMap: shape
    });

    const randomPoints = new THREE.Points(randomGeometry, randomMaterial);
    const randomPosition = new THREE.Vector3(
        Math.random() * 400 - 200,  // Adjust the range based on your scene size
        Math.random() * 400 - 200,
        Math.random() * 400 - 200
    );
    randomPoints.position.copy(randomPosition);
    randomPoints.rotation.set(randomRotationX, randomRotationY, randomRotationZ);
    scene.add(randomPoints);
}

function createRandomGalaxies(numGalaxies) {
    for (let i = 0; i < numGalaxies; i++) {
        createRandomGalaxy();
    }
}


function createGalaxy(){
    if(points !== null){
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(GalaxyParameters.count *3);
    const colors = new Float32Array(GalaxyParameters.count *3);

    const colorInside = new THREE.Color(GalaxyParameters.insideColor);
    const colorOutside = new THREE.Color(GalaxyParameters.outsideColor);

    for(let i=0; i<GalaxyParameters.count; i++){

        //Position
        const x = Math.random() * GalaxyParameters.radius;
        const branchAngle = (i % GalaxyParameters.branches) / GalaxyParameters.branches * 2 * Math.PI;
        const spinAngle = x * GalaxyParameters.spin;

        const randomX = Math.pow(Math.random(), GalaxyParameters.randomnessPower) * (Math.random()<0.5 ? 1: -1);
        const randomY = Math.pow(Math.random(), GalaxyParameters.randomnessPower) * (Math.random()<0.5 ? 1: -1);
        const randomZ = Math.pow(Math.random(), GalaxyParameters.randomnessPower) * (Math.random()<0.5 ? 1: -1);

        positions[i*3] = Math.sin(branchAngle + spinAngle) * x + randomX;
        positions[i*3 + 1] = randomY;
        positions[i*3 + 2] = Math.cos(branchAngle + spinAngle) * x + randomZ;

        //Color

        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, x / GalaxyParameters.radius);

        colors[i*3 + 0] = mixedColor.r;
        colors[i*3 + 1] = mixedColor.g;
        colors[i*3 + 2] = mixedColor.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
        color: 'white',
        size: GalaxyParameters.size,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        alphaMap: shape
    });

    points = new THREE.Points(geometry, material);
    points.position.copy(galaxyPosition);
    scene.add(points);
}


//Mouse
document.addEventListener('mousemove', animateParticles);
let mouseX = 0;
let mouseY = 0;

function animateParticles(event){
    mouseY = event.clientY;
    mouseX = event.clientX;
}

function changeCameraPositionToGalaxy() {
    // Set the camera position to look at the galaxy
    // const galaxyPosition = new THREE.Vector3(50, 0, 100);

    camera.position.set(galaxyPosition.x + 3, galaxyPosition.y + 5, galaxyPosition.z + 10);
    // camera.position.set(53, 5, 110);
    camera.lookAt(galaxyPosition);

}

function createGUI() {
    const CameraFolder = gui.addFolder('Spaceship Controls');
    CameraFolder.add({ flySpaceship: flySpaceship }, 'flySpaceship').name('Fly Spaceship').onChange((value) => {
        flySpaceship = value;
        if (flySpaceship) {
            cameraControls.enabled = false;
        } else {
            cameraControls.enabled = true;
        }
    });

    // Add a button to reverse the spaceship
    CameraFolder.add({ reverse: false }, 'reverse').name('Reverse').onChange((value) => {
        if (spacecraft) {
            const rotationAxis = new THREE.Vector3(0, 1, 0); // You can adjust the axis as needed
            const rotationAngle = Math.PI; // 180 degrees in radians

            // Apply rotation to the spacecraft mesh
            spacecraft.rotateOnWorldAxis(rotationAxis, rotationAngle);
        }
    });

    CameraFolder.open();

    const galaxyControls = gui.addFolder('Galaxy Controls');
    galaxyControls.add({ changeCameraPosition: changeCameraPositionToGalaxy }, 'changeCameraPosition').name('Go to Galaxy');

    galaxyControls.add(GalaxyParameters, 'count').min(100).max(100000).step(100).onChange(createGalaxy).name('stars count');
    galaxyControls.add(GalaxyParameters, 'size').min(0.001).max(0.1).step(0.001).onChange(createGalaxy).name('star size');
    galaxyControls.add(GalaxyParameters, 'radius').min(1).max(10).step(1).onChange(createGalaxy).name('radius');
    galaxyControls.add(GalaxyParameters, 'branches').min(1).max(10).step(1).onChange(createGalaxy).name('branches count');
    galaxyControls.add(GalaxyParameters, 'spin').min(-5).max(5).step(0.001).onChange(createGalaxy).name('spin');
    galaxyControls.add(GalaxyParameters, 'randomnessPower').min(1).max(10).step(1).onChange(createGalaxy).name('randomness');
    galaxyControls.addColor(GalaxyParameters, 'insideColor').onChange(createGalaxy).name('core color');
    galaxyControls.addColor(GalaxyParameters, 'outsideColor').onChange(createGalaxy).name('branches color');

    galaxyControls.open();

    const bloomParameters = {
        bloomIntensity: bloomPass.strength,
        bloomThreshold: bloomPass.threshold,
        bloomRadius: bloomPass.radius,
    };

    const bloomControls = gui.addFolder('Bloom Controls');
    bloomControls.add(bloomParameters, 'bloomIntensity').min(0).max(2).step(0.01).onChange((value) => {
        bloomPass.strength = value;
    }).name('intensity');
    bloomControls.add(bloomParameters, 'bloomRadius').min(0).max(1).step(0.01).onChange((value) => {
        bloomPass.radius = value;
    }).name('radius');

    bloomControls.open();
    gui.add({ logCameraSettings: logCameraSettings }, 'logCameraSettings').name('log camera Settings');

}

function logCameraSettings() {
    console.log("Camera Position:", camera.position);
    console.log("Camera Target:", cameraTarget);
    console.log("Camera Controls:", cameraControls);
}

async function loadShaders(shaderPaths) {
    try {

        const shaderTexts = await fetchShaderTexts(...Object.values(shaderPaths));

        shaders = {
            haloVertexShader: shaderTexts[shaderPaths.haloVertexShader],
            haloFragmentShader: shaderTexts[shaderPaths.haloFragmentShader],
        }

        // Continue with the rest of your initialization or rendering logic
    } catch (error) {
        console.error('Failed to load shaders:', error);
    }
}
function createParticles() {
    const particleGeomerty = new THREE.BufferGeometry;
    const particlesCnt = 8000;
    const sizesArray = new Float32Array(particlesCnt);
    for (let i = 0; i < particlesCnt; i++) {
        sizesArray[i] = Math.random() * 0.8 + 0.1;
    }


    const posArray = new Float32Array(particlesCnt*3);

    for (let i = 0; i < particlesCnt * 3; i++) {
        posArray[i] = (Math.random() - 0.5)  * 500  ;
        posArray[i + 1] = (Math.random() - 0.5) * 500; // Y coordinate
        posArray[i + 2] = (Math.random() - 0.5) * 500; // Z coordinate
    }
    particleGeomerty.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const material = new THREE.PointsMaterial({
        size: sizesArray,
    })

    particlesMesh = new THREE.Points(particleGeomerty, material);
    scene.add(particlesMesh);

}

function createSystem() {

    // add Sun
    const sunGeometry = new THREE.SphereGeometry(9, 50, 50);
    const sunTexture = loader.load("textures/sun.png");
    const sunMaterial = new THREE.MeshBasicMaterial({map: sunTexture });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.castShadow = true;
    sunMesh.receiveShadow = true;
    sunLight.position.set(sunMesh.position.x, sunMesh.position.y, sunMesh.position.z);
    const solarSystem = new THREE.Group();
    solarSystem.add(sunMesh);

    const halo = new THREE.Mesh(
        new THREE.SphereGeometry(8, 50, 50),
        new THREE.ShaderMaterial({
            vertexShader:shaders.haloVertexShader,
            fragmentShader:shaders.haloFragmentShader,
            blending: THREE.AdditiveBlending,
            uniforms: {
                lightPosition: {value: sunLight.position},
                sunTexture: { value: sunTexture }
            },
            transparent: true,
            opacity: 0.5,
            depthTest: true,
        })
    )
    halo.scale.set(1.5, 1.5, 1.5);
    solarSystem.add(halo);


    // additional sunlight for phong
    const sun = new THREE.PointLight(0xffffff, 100);
    sun.position.set(0, 0, 0);
    scene.add(sun);


    // add mercury
    const mercury = new Planet(2, 16, 0, "textures/mercury.png");
    const mercuryMesh = mercury.getMesh();
    mercurySystem = new THREE.Group();
    mercurySystem.add(mercuryMesh);

    //add venus
    const venus = new Planet(3, 0, 32,"textures/venus.png");
    const venusMesh = venus.getMesh();
    venusSystem = new THREE.Group();
    venusSystem.add(venusMesh);

    //add earth
    const earth = new Planet(4, -48, 0,"textures/earth.jpg");
    const earthMesh = earth.getMesh();
    earthSystem = new THREE.Group();
    earthSystem.add(earthMesh);

    //add mars
    const mars = new Planet(5, 0, -64,"textures/mars.png");
    const marsMesh = mars.getMesh();
    marsSystem = new THREE.Group();
    marsSystem.add(marsMesh);

    //add Jupiter
    const jupiter = new Planet(6, 80, 0,"textures/jupiter.png");
    const jupiterMesh = jupiter.getMesh();
    jupiterSystem = new THREE.Group();
    jupiterSystem.add(jupiterMesh);

    //add Saturn
    const saturn = new Planet(7, 0, 75,"textures/saturn.png");
    const saturnMesh = saturn.getMesh();
    saturnSystem = new THREE.Group();
    saturnSystem.add(saturnMesh);

    //add Uranus
    const uranus = new Planet(8, -112, 0,"textures/uranus.png");
    const uranusMesh = uranus.getMesh();
    uranusSystem = new THREE.Group();
    uranusSystem.add(uranusMesh);

    //add Neptune
    const neptune = new Planet(9, 0, -130,"textures/neptune.png");
    const neptuneMesh = neptune.getMesh();
    neptuneSystem = new THREE.Group();
    neptuneSystem.add(neptuneMesh);

    solarSystem.add(mercurySystem, venusSystem, earthSystem, marsSystem, jupiterSystem, saturnSystem, uranusSystem, neptuneSystem);
    scene.add(solarSystem);

}

function createSpacecraft(){
    model_loader.load('scene.gltf',  function (gltf)  {
            spacecraft  = gltf.scene;

            const spacecraftMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: 0x404040,
                    metalness: 4,
                    roughness: 1
                    });

            spacecraft.traverse((child) => {
                if (child.isMesh) {
                    child.material = spacecraftMaterial
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            spacecraft.position.set(20, 15, 0);
            // spacecraft.position.set(50, 5, 50);
            const scaleFactor = 0.2;
            spacecraft.scale.set(scaleFactor, scaleFactor, scaleFactor);

            scene.add(spacecraft );

            frontLight = new THREE.PointLight(0xffffff, 100);
            midLight = new THREE.PointLight(0xffffff, 100);
            frontLight.position.set(spacecraft.position.x  - 1, spacecraft.position.y, spacecraft.position.z);
            midLight.position.set(spacecraft.position.x  - 5, spacecraft.position.y - 1, spacecraft.position.z);
            scene.add(frontLight);
            scene.add(midLight);

        },
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.log( 'An error happened' );

        })
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function onKeyDown(event) {
    // Handle keydown events to start moving the spacecraft
    switch (event.code) {
        case 'ArrowUp':
            spacecraftDirection.y = 1;
            break;
        case 'ArrowDown':
            spacecraftDirection.y = -1;
            break;
        case 'ArrowLeft':
            spacecraftDirection.x = -1;
            break;
        case 'ArrowRight':
            spacecraftDirection.x = 1;
            break;
        case 'KeyW':
            spacecraftDirection.z = 1; // Move up
            break;
        case 'KeyS':
            spacecraftDirection.z = -1; // Move down
            break;
    }
}

function onKeyUp(event) {
    // Handle keyup events to stop moving the spacecraft
    switch (event.code) {
        case 'ArrowUp':
        case 'ArrowDown':
            spacecraftDirection.y = 0;
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            spacecraftDirection.x = 0;
            break;
        case 'KeyW':
        case 'KeyS':
            spacecraftDirection.z = 0;
            break;
    }
}

function createCameraControls() {
    cameraControls = new OrbitControls(camera, container);
    cameraControls.panSpeed = 100;
    // cameraControls.enableDamping = true;

    cameraControls.keys = {
        LEFT: 'ArrowLeft',
        UP: 'ArrowUp',
        RIGHT: 'ArrowRight',
        BOTTOM: "ArrowDown"
    }
    cameraControls.listenToKeyEvents(window);

    if (spacecraft) {
        camera.position.set(spacecraft.position.x - 10, spacecraft.position.y + 10, spacecraft.position.z + 20);
        cameraTarget.copy(spacecraft.position);
    }
}

function createLights() {
    sunLight = new THREE.PointLight(0xffffff, 100);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;

    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.05;
    sunLight.shadow.camera.far = 5000;
    sunLight.shadow.bias = -0.001; // Adjust as needed
    sunLight.shadow.normalBias = 0.002; // Adjust as needed

    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.75);
    scene.add(ambientLight);
}

function createCamera() {
    const aspect = container.clientWidth / container.clientHeight;
    const fov = 100;     // fov = Field of View
    const near = 0.1;   // near clipping plain
    const far = 500;    // far clipping plane

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-10, 10, 20);
    camera.lookAt(0, 0, 0);
}

function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.debug = true;
    renderer.toneMapping = THREE.ReinhardToneMapping;

    container.appendChild(renderer.domElement);
}


function postProcessing() {
    // Create an EffectComposer
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);

}

function init() {
    container = document.querySelector('#scene-container');
    scene = new THREE.Scene();

    createCamera();
    createLights();
    createCameraControls();     // enable Camera to move around
    createGalaxy();
    loadShaders(shaderPaths).then(() => {
        createParticles();
        createRandomGalaxies(15);
        createSpacecraft();
        createSystem();
        createRenderer();
        postProcessing();
        createGUI();
        play();
        renderer.render(scene, camera);
    }).catch((error) => {
        console.error('Failed to load shaders:', error);
    });
}

function play(solarSystem) {
    renderer.setAnimationLoop((timestamp) => {
        update(timestamp);
        render();
    });
}

function stop() {
    renderer.setAnimationLoop(null);
}

function updateLights() {
    frontLight.position.set(spacecraft.position.x - 1, spacecraft.position.y, spacecraft.position.z);
    midLight.position.set(spacecraft.position.x  - 5, spacecraft.position.y -1 , spacecraft.position.z);
}

function update(timestamp) {
    timestamp *= 0.001;
    const speed = 0.5;

    if (spacecraft && flySpaceship) {
        const spacecraftSpeedMultiplier = spacecraftSpeed * timestamp;
        spacecraft.position.x += spacecraftDirection.x * spacecraftSpeedMultiplier;
        spacecraft.position.z += spacecraftDirection.z * spacecraftSpeedMultiplier;
        spacecraft.position.y += spacecraftDirection.y * spacecraftSpeedMultiplier;
        updateLights();

        camera.position.set(spacecraft.position.x - 10, spacecraft.position.y + 10, spacecraft.position.z + 20);
        cameraTarget.copy(spacecraft.position);
        camera.lookAt(cameraTarget);
    }
    else {
        cameraControls.update();
    }
    sunMesh.rotation.y += 0.001;
    mercurySystem.rotation.y += EARTH_YEAR * 4;
    venusSystem.rotation.y += EARTH_YEAR * 2;
    earthSystem.rotation.y += EARTH_YEAR;
    marsSystem.rotation.y += EARTH_YEAR * 0.5;
    jupiterSystem.rotation.y += EARTH_YEAR * 0.2;
    saturnSystem.rotation.y += EARTH_YEAR * 0.1;
    uranusSystem.rotation.y += EARTH_YEAR * 0.05;
    neptuneSystem.rotation.y += EARTH_YEAR * 0.025;

    particlesMesh.rotation.x += mouseY * (0.0000008);
    particlesMesh.rotation.y += mouseX * (0.0000008);

}

function render() {
    // renderer.render(scene, camera);
    composer.render();
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Event Listeners
window.addEventListener('resize', onWindowResize);

// Initialize the Scene
init();
