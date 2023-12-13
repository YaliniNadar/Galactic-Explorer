import * as THREE from "https://unpkg.com/three@0.156.1/build/three.module.js";
export default  class Planet {
    constructor(radius, positionX, positionZ, textureFile=null, customMaterial=null) {
        this.radius = radius;
        this.positionX = positionX;
        this.positionz = positionZ;
        this.textureFile = textureFile;
        this.customMaterial = null
        this.mesh = null;
     }

     getMesh() {
        if (this.mesh === undefined || this.mesh === null) {
            const geometry = new THREE.SphereGeometry(this.radius);

            let material;
            if (this.customMaterial) {
                material = this.customMaterial;
            }
            else  {
                const texture = new THREE.TextureLoader().load(this.textureFile);
                // material = new THREE.MeshBasicMaterial({map: texture});

                material = new THREE.MeshPhongMaterial({
                    map: texture,
                    specular: 'yellow', // Color of the specular highlight
                    shininess: 6,      // Shininess factor,
                });
            }
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.mesh.position.x += this.positionX;
            this.mesh.position.z += this.positionz;

        }
        return this.mesh;
     }
}
