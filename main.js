import * as THREE from 'three';
import {ARButton} from 'three/addons/webxr/ARButton.js';
import {OrbitControls} from 'three/addons/webxr/OrbitControls.js';
import {GLTFLoader} from 'three/addons/webxr/GLTFLoader.js';
import {HDRLoader} from 'three/addons/webxr/HDRLoader.js';

let scene,camera,renderer,reticle,controller;
let controls;
let hitTestSource=null;
let hitTestSourceRequested=false;
let current_object=null;
let current_url="1";
let loading_model=null;

init();

function init(){
scene=new THREE.Scene();

camera=new THREE.PerspectiveCamera(
70,
window.innerWidth/window.innerHeight,
0.01,
20
);

const light=new THREE.HemisphereLight(
0xffffff,
0xbbbbff,
3
);
light.position.set(0.5,1,0.25);
scene.add(light);

renderer=new THREE.WebGLRenderer({
antialias:true,
alpha:true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.xr.enabled=true;

document.body.appendChild(renderer.domElement);

controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,0,0);
controls.update();

controller=renderer.xr.getController(0);
controller.addEventListener('select',onSelect);
scene.add(controller);

const options={
requiredFeatures:['hit-test'],
optionalFeatures:['dom-overlay']
};

options.domOverlay={
root:document.getElementById('content')
};

document.body.appendChild(
ARButton.createButton(renderer,options)
);

const geometry=new THREE.RingGeometry(
0.15,
0.20,
32
);

geometry.rotateX(-Math.PI/2);

const material=new THREE.MeshBasicMaterial({
color:0xffffff
});

reticle=new THREE.Mesh(
geometry,
material
);

reticle.matrixAutoUpdate=false;
reticle.visible=false;
scene.add(reticle);

window.addEventListener('resize',onWindowResize);

renderer.setAnimationLoop(animate);

loadModel("1");
}

function loadModel(model){
current_url=model;
loading_model=model;

if(current_object){
scene.remove(current_object);
current_object=null;
}

const loader=new GLTFLoader();

loader.load(
'model/'+model+'.glb',
function(gltf){
if(loading_model!==model)return;

current_object=gltf.scene;
current_object.visible=false;
scene.add(current_object);

const box=new THREE.Box3().setFromObject(current_object);
const center=box.getCenter(new THREE.Vector3());

current_object.position.sub(center);

controls.target.set(0,0,0);
controls.update();

current_object.position.set(0,0,-2);
current_object.visible=true;
},
undefined,
function(error){
console.error('Erreur lors du chargement de '+model+'.glb',error);
}
);
}

$(".ar-object").click(function(event){
event.preventDefault();

const selected_model=$(this).attr("id");

current_url=selected_model;

if(!renderer.xr.isPresenting){
loadModel(selected_model);
}

closeNav();
});

function onSelect(){
if(!current_object)return;
if(!reticle.visible)return;

current_object.position.setFromMatrixPosition(reticle.matrix);
current_object.visible=true;
}

function animate(timestamp,frame){
if(!frame){
renderer.render(scene,camera);
return;
}

const referenceSpace=renderer.xr.getReferenceSpace();
const session=renderer.xr.getSession();

if(!hitTestSourceRequested){
hitTestSourceRequested=true;

session.requestReferenceSpace('viewer')
.then(function(viewerSpace){
return session.requestHitTestSource({
space:viewerSpace
});
})
.then(function(source){
hitTestSource=source;
});

session.addEventListener('end',function(){
hitTestSourceRequested=false;
hitTestSource=null;
reticle.visible=false;

if(current_object){
current_object.visible=false;
current_object.position.set(0,0,-2);
}
},{once:true});
}

if(hitTestSource){
const hitTestResults=frame.getHitTestResults(hitTestSource);

if(hitTestResults.length>0){
const hit=hitTestResults[0];
const pose=hit.getPose(referenceSpace);

if(pose){
reticle.visible=true;
reticle.matrix.fromArray(pose.transform.matrix);
}
}else{
reticle.visible=false;
}
}

renderer.render(scene,camera);
}

function onWindowResize(){
camera.aspect=window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth,window.innerHeight);
}