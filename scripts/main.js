window.onload = () => {

    //Three.js objects
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,500);
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    const ambient = new THREE.AmbientLight(0x404040, 5)
    renderer.setSize(window.innerWidth, window.innerHeight);

   document.body.appendChild(renderer.domElement)
   scene.add(ambient);

   const gameInstance = new Game(scene,camera)

   function animate(){
       requestAnimationFrame(animate);
       gameInstance.update();
       renderer.render(scene,camera)
   }
   animate();
}