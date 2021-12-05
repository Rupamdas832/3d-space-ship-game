//import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js";

class Game {
    OBSTACLE_PREFAB = new THREE.BoxBufferGeometry(1,1,1);
    loader = new THREE.TextureLoader();
    OBSTACLE_MATERIAL = new THREE.MeshLambertMaterial({map: this.loader.load('https://media.istockphoto.com/photos/mortar-and-degree-picture-id891698738?b=1&k=20&m=891698738&s=170667a&w=0&h=Ievxlpb_3aWYuU5NGZqYQ7Xxad4fbxt903zQJJKL9TM=')})
    BONUS_PREFAB = new THREE.SphereBufferGeometry(1,12,12);
    HEALTH_PREFAB = new THREE.SphereBufferGeometry(1,12,12);
    HEALTH_MATERIAL = new THREE.MeshLambertMaterial({map: this.loader.load('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0-xhjcjcruCp8GeXVdPOa0Z3-iQI_XB5pLA&usqp=CAU')})
    COLLISION_THRESHOLD = 0.5;
    
    constructor(scene,camera){

        //global variable
        this.highestScore = 0;
        this.highestDistance = 0;

        //UI
        this.healthUI = document.querySelector(".health")
        this.scoreUI = document.querySelector(".score")
        this.distanceUI = document.querySelector(".distance")
        this.highestScoreUI = document.querySelector(".highest-score")
        this.highestDistanceUI = document.querySelector(".highest-distance")
        this.gameoverUI = document.querySelector(".game-over-panel")
        this.gamepauseUI = document.querySelector(".game-pause-panel")
        this.gameoverScoreUI = document.querySelector(".game-over-score")
        this.gameoverDistanceUI = document.querySelector(".game-over-distance")
        this.damageScreen = document.querySelector(".damage")
        this.pointsScreen = document.querySelector(".points-div")
        this.pointsUI = document.querySelector(".points")
        this.healthIncScreen = document.querySelector(".health-inc-div")
        this.healthIncUI = document.querySelector(".health-inc")

        this.scene = scene;
        this.camera = camera
        this.resetGame(false)

        //Game start btn
        document.querySelector(".start-btn").addEventListener('click', () => {
            this.running = true;
            document.querySelector('.menu-panel').style.display = 'none';
            document.querySelector('.instruction').style.display = 'none';
        })
        //Replay btn
        document.querySelector(".restart-btn").addEventListener('click', () => {
            this.running = true;
            this.gameoverUI.style.display = 'none';
        })
        //Resume btn
        document.querySelector(".resume-btn").addEventListener('click', () => {
            this.running = true;
            this.gamepauseUI.style.display = 'none';
        })

        document.addEventListener('keydown', this.keydownFunc.bind(this))
        document.addEventListener('keyup', this.keyupFunc.bind(this))
        
    }
    
    update(){
        if(!this.running){
            return
        }
        const timeDelta = this.clock.getDelta();
        this.time += timeDelta;

        if(this.rotationLerp !== null){
            this.rotationLerp.update(timeDelta)
        }

        if(this.translateX > 20){
            this.translateX = 20
        }else if(this.translateX < -20){
            this.translateX = -20
        }else{
            this.translateX += this.speedX*-0.2;
        }
        
        this.updateGrid();
        this.checkCollisions();
        this.updateInfoPanel();
    }

    keydownFunc(event){
        let newSpeedX;
        switch (event.key) {
            case 'ArrowLeft':
                newSpeedX = -1.0;
                break;
            case 'ArrowRight':
                newSpeedX = 1.0;
                break;
            case 'Escape':
                this.gamepauseUI.style.display = 'grid';
                this.running = false
                break;
            default:
                newSpeedX = this.speedX;
                break;
        }

        if(this.speedX !== newSpeedX){
            this.speedX = newSpeedX;
            this.rotateShip(-this.speedX*20*Math.PI/180,0.8)
        }
        
    }

    keyupFunc(){
        this.speedX =0;
        this.rotateShip(0,0.5)
    }

    rotateShip(targetRotation, delay){
        const $this = this;
        this.rotationLerp = new Lerp(this.ship.rotation.z,targetRotation, delay )
        .onUpdate((value) => {$this.ship.rotation.z = value})
        .onFinish(() => {$this.rotationLerp = null})
    }

    updateGrid(){
        this.speedZ += 0.005;
        this.grid.material.uniforms.speedZ.value = this.speedZ;
        this.grid.material.uniforms.time.value = this.time
        this.objectParent.position.z = this.speedZ*this.time
        this.grid.material.uniforms.translateX.value = this.translateX
        this.objectParent.position.x = this.translateX

        this.objectParent.traverse((child) => {
            if(child instanceof THREE.Mesh){
                //position in world space
                const childZPos = child.position.z + this.objectParent.position.z;
                if(childZPos >0){
                    //reset the position
                    const params = [child,this.translateX, -this.objectParent.position.z]
                    if(child.userData.type === "obstacle"){
                        this.setUpObstacle(...params)
                    }else if(child.userData.type === "health"){
                        this.setUpHealth(...params)
                        child.userData.heathInc = 10;
                    }else{
                        const price = this.setUpBonus(...params)
                        child.userData.price = price;
                    }
                }
            }
        })
    }

    checkCollisions(){
        this.objectParent.traverse((child) => {
            if(child instanceof THREE.Mesh){
                //position in world space
                const childZPos = child.position.z + this.objectParent.position.z;
                
                //threshold distance
                const thresholdX = this.COLLISION_THRESHOLD + child.scale.x/2;
                const thresholdZ = this.COLLISION_THRESHOLD + child.scale.z/2;

                if(childZPos > -thresholdZ && Math.abs(child.position.x + this.translateX) < thresholdX){
                    //collision
                    const params = [child,this.translateX, -this.objectParent.position.z]
                    if(child.userData.type === "obstacle"){
                        this.health -= 25;
                        this.damageScreen.style.display = "flex"
                        setTimeout(() =>{
                            this.damageScreen.style.display = 'none'
                        },100)
                        this.healthUI.innerText = this.health
                        this.setUpObstacle(...params)
                        if(this.health <1){
                            this.gameOver();
                        }
                    }else if(child.userData.type === "health"){
                        if(this.health <91){
                            this.health += 10
                            this.healthIncScreen.style.display = "grid"
                            this.healthIncUI.innerText = "+" + 10 + " Health";
                            setTimeout(() =>{
                                this.healthIncScreen.style.display = 'none'
                            },1000)
                        }else{
                            this.health = 100
                            this.healthIncScreen.style.display = "grid"
                            this.healthIncUI.innerText = "Max Health";
                            setTimeout(() =>{
                                this.healthIncScreen.style.display = 'none'
                            },1000)
                        }
                        this.healthUI.innerText = this.health
                        this.setUpHealth(...params)
                    }else{
                        //flash display point
                        this.pointsScreen.style.display = "grid"
                        this.pointsUI.innerText = "+" + child.userData.price;
                        setTimeout(() =>{
                            this.pointsScreen.style.display = 'none'
                        },1000)
                        //update score
                        this.score += child.userData.price;
                        this.scoreUI.innerText = this.score
                        const price = this.setUpBonus(...params)
                        child.userData.price = price;
                    }
                }
            }
        })

    }

    updateInfoPanel(){
        this.distance = this.objectParent.position.z.toFixed(0)
        this.distanceUI.innerText = this.distance
    }

    gameOver(){
        this.running = false;
        this.gameoverUI.style.display = "grid"
        this.gameoverScoreUI.innerText = this.score;
        this.gameoverDistanceUI.innerText = this.distance;
       
        this.resetGame(true)
    }

    resetGame(isReplay){

        if(isReplay){
            if(this.score > this.highestScore){
                this.highestScore = this.score
            }
            // if(this.distance > this.highestDistance){
            //     this.highestDistance = this.distance
            // }
        }
        //variables
        this.running = false;
        this.speedZ = 15;
        this.speedX = 0;
        this.translateX = 0;
        this.rotationLerp = null;
        this.health = 100;
        this.score = 0;
        this.distance = 0;
        this.time = 0;
        this.clock = new THREE.Clock();
        

        //show UI Displays
        this.healthUI.innerText = this.health
        this.scoreUI.innerText = this.score
        this.distanceUI.innerText = this.distance
        this.highestScoreUI.innerText = this.highestScore
        // this.highestDistanceUI.innerText = this.highestDistance

        //prepare 3d scene
        this.initializeScene(this.scene,this.camera,isReplay)
    }

    createShip(scene){
        const shipBody = new THREE.Mesh(
            new THREE.TetrahedronBufferGeometry(0.4),
            new THREE.MeshBasicMaterial({color: 0xbbaadd})
        )
        shipBody.rotateX(45*Math.PI/180);
        shipBody.rotateY(45*Math.PI/180);
        this.ship = new THREE.Group();
        

        //Big reactors at the back
        const reactorSocketGeometry = new THREE.CylinderBufferGeometry(0.08,0.08,0.1,16);
        const reactorSocketMaterial = new THREE.MeshBasicMaterial({color: 0x99aacc})

        const reactorSocket1 = new THREE.Mesh(reactorSocketGeometry,reactorSocketMaterial)
        const reactorSocket2 = new THREE.Mesh(reactorSocketGeometry,reactorSocketMaterial)
        const reactorSocket3 = new THREE.Mesh(reactorSocketGeometry,reactorSocketMaterial)

        //Small reactors at the back
        const reactorLightGeometry = new THREE.CylinderBufferGeometry(0.055,0.055,0.1,16);
        const reactorLightMaterial = new THREE.MeshBasicMaterial({color: 0xaadeff})

        const reactorLight1 = new THREE.Mesh(reactorLightGeometry,reactorLightMaterial)
        const reactorLight2 = new THREE.Mesh(reactorLightGeometry,reactorLightMaterial)
        const reactorLight3 = new THREE.Mesh(reactorLightGeometry,reactorLightMaterial)
        
        this.ship.add(shipBody)
        this.ship.add(reactorSocket1)
        this.ship.add(reactorSocket2)
        this.ship.add(reactorSocket3)
        this.ship.add(reactorLight1)
        this.ship.add(reactorLight2)
        this.ship.add(reactorLight3)

        reactorSocket1.rotateX(90*Math.PI/180)
        reactorSocket1.position.set(-0.15,0,0.1)
        reactorSocket2.rotateX(90*Math.PI/180)
        reactorSocket2.position.set(0.15,0,0.1)
        reactorSocket3.rotateX(90*Math.PI/180)
        reactorSocket3.position.set(0,-0.15,0.1)
        reactorLight1.rotateX(90*Math.PI/180)
        reactorLight1.position.set(-0.15,0,0.11)
        reactorLight2.rotateX(90*Math.PI/180)
        reactorLight2.position.set(0.15,0,0.11)
        reactorLight3.rotateX(90*Math.PI/180)
        reactorLight3.position.set(0,-0.15,0.11)

        // let loader = new THREE.GLTFLoader();
        // loader.setPath('../low_poly_spaceship/')
        // loader.load('scene.gltf', (gltf) => {
        //     const model = gltf.scene.children[0];
        //     const group = new THREE.Group();
        //     group.add(model)
        //     console.log(gltf.scene)
        //     scene.add(group)
        // })

        scene.add(this.ship)

    }

    createGrid(scene){
        let division = 30;
        let limit = 200;
        this.grid = new THREE.GridHelper(limit * 2, division, "black", "black");
        
        var moveableZ = [];
        var moveableX = [];
        for (let i = 0; i <= division; i++) {
          moveableZ.push(1, 1, 0, 0); // move horizontal lines only (1 - point is moveable)
          moveableX.push(0, 0,1, 1); // move horizontal lines only (1 - point is moveable)
        }
        this.grid.geometry.addAttribute('moveableZ', new THREE.BufferAttribute(new Uint8Array(moveableZ), 1));
        this.grid.geometry.addAttribute('moveableX', new THREE.BufferAttribute(new Uint8Array(moveableX), 1));
        this.grid.material = new THREE.ShaderMaterial({
          uniforms: {
            time: {
              value: 0
            },
            limits: {
              value: new THREE.Vector2(-limit, limit)
            },
            speedZ: {
              value: this.speedZ
            },
            translateX: {
                value: this.translateX
            }
          },
          vertexShader: `
            uniform float time;
            uniform vec2 limits;
            uniform float speedZ;
            uniform float translateX;
            
            attribute float moveableZ;
            attribute float moveableX;
            
            varying vec3 vColor;
          
            void main() {
              vColor = color;
              float limLen = limits.y - limits.x;
              vec3 pos = position;
              if (floor(moveableX + 0.5) > 0.5){ // if a point has "moveableX" attribute = 1 
                float dist = translateX;
                float currPos = mod((pos.z + dist) - limits.x, limLen) + limits.x;
                pos.z = currPos;
              }
              if (floor(moveableZ + 0.5) > 0.5){ // if a point has "moveableZ" attribute = 1 
                float dist = speedZ * time;
                float currPos = mod((pos.z + dist) - limits.x, limLen) + limits.x;
                pos.z = currPos;
              } 
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
          
            void main() {
              gl_FragColor = vec4(vColor, 1.);
            }
          `,
          vertexColors: THREE.VertexColors
        });
        
        scene.add(this.grid);

        
    }

    initializeScene(scene,camera,isReplay){
        if(!isReplay){
            //first load
            camera.position.z = 5;
            camera.rotateX(-20*Math.PI/180)
            camera.position.set(0,1.5,2)
    
            this.createShip(scene)
            this.createGrid(scene)
    
            this.objectParent = new THREE.Group();
            scene.add(this.objectParent)
    
            for(let i=0;i<20;i++){
                this.spawnObstacles();
            }
            for(let i=0;i<5;i++){
                this.spawnBonus();
            }
            for(let i=0;i<1;i++){
                this.spawnHealth();
            }
        }else{
            this.objectParent.traverse((child) => {
                if(child instanceof THREE.Mesh){
                    if(child.userData.type === 'obstacle'){
                        this.setUpObstacle(child)
                    }else if(child.userData.type === "health"){
                        this.setUpHealth(...params)
                    }else{
                        child.userData.price = this.setUpBonus(child);
                    }
                }else{
                    child.position.set(0,0,0)
                }
            })
        }
        
        
    }

    spawnObstacles(){
    const obj = new THREE.Mesh(
        this.OBSTACLE_PREFAB,
        this.OBSTACLE_MATERIAL
    )    

    //get random scale
    this.setUpObstacle(obj)
    obj.userData = {type: "obstacle"}
    this.objectParent.add(obj)
    }

    setUpObstacle(obj, refXPos = 0, refZPos=0){
        obj.scale.set(1.5,1.5,1.5)
        obj.position.set(
            refXPos + this.randomFloat(-20,20),
            obj.scale.y * 0.5,
            refZPos -50 - this.randomFloat(0,50)
        )
        
    }

    spawnBonus(){
        const obj = new THREE.Mesh(
            this.BONUS_PREFAB,
            new THREE.MeshLambertMaterial({map: this.loader.load('../assets/neog.jpg')})
        )  
        const price = this.setUpBonus(obj);
        obj.userData = {type: "bonus",price: price}
        this.objectParent.add(obj)
    }

    setUpBonus(obj, refXPos = 0, refZPos=0){
        const price = this.randomInt(5,20)
        const ratio = price /20;
        const size = ratio*0.5;  
        const hue = 0.1+0.5*ratio;

        obj.scale.set(0.5,0.5,0.5)
       obj.material.color.setHSL(hue,1,0.5);
        obj.position.set(
            refXPos + this.randomFloat(-20,20),
            obj.scale.y * 0.5,
            refZPos -50 - this.randomFloat(0,50)
        )
        obj.rotation.y = -this.randomFloat(2,0.1)
        return price;
    }
    spawnHealth(){
        const obj = new THREE.Mesh(
            this.HEALTH_PREFAB,
            this.HEALTH_MATERIAL
        )  
        this.setUpHealth(obj)
        obj.userData = {type: "health"}
        this.objectParent.add(obj)
    }

    setUpHealth(obj, refXPos = 0, refZPos=0){
        const price = this.randomInt(5,20)
        const ratio = price /20;
        const size = ratio*0.5;  
        const hue = 0.1+0.5*ratio;

        obj.scale.set(0.5,0.5,0.5)
    //    obj.material.color.setHSL(hue,1,0.5);
        obj.position.set(
            refXPos + this.randomFloat(-20,20),
            obj.scale.y * 0.5,
            refZPos -50 - this.randomFloat(0,50)
        )
        obj.rotation.y = -this.randomFloat(2,0.1)
    }

    randomFloat(max,min){
        return Math.random()*(max-min) + min;
    }
    randomInt(max,min){
        min = Math.ceil(min);
        max = Math.floor(max)
        return Math.floor(Math.random()*(max-min + 1)) + min;
    }
}