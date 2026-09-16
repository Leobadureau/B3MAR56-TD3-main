import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/webxr/GLTFLoader.js';
import { OrbitControls } from 'three/addons/webxr/OrbitControls.js';
import { HDRLoader } from 'three/addons/webxr/HDRLoader.js';

var scene,camera,renderer;
var reticle,controller,controls;

var hitTestSource=null;
var hitTestSourceRequested=false;

var current_object=null;
var loading_model=null;

// Modèle actuellement sélectionné
var selected_model='1';

// Tous les modèles déjà placés
var placed_objects=[];

init();

function init(){
    scene=new THREE.Scene();

    camera=new THREE.PerspectiveCamera(
        70,
        window.innerWidth/window.innerHeight,
        0.01,
        20
    );

    var light=new THREE.HemisphereLight(
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

    controls=new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.target.set(0,0,0);
    controls.update();

    controller=renderer.xr.getController(0);

    controller.addEventListener(
        'select',
        onSelect
    );

    scene.add(controller);

    // Options WebXR avec le Hit Test et le menu HTML
    var options={
        requiredFeatures:['hit-test'],
        optionalFeatures:['dom-overlay'],
        domOverlay:{
            root:document.getElementById('content')
        }
    };

    document.body.appendChild(
        ARButton.createButton(
            renderer,
            options
        )
    );

    // Création du reticle qui indique
    // l'endroit où le modèle sera placé
    var geometry=new THREE.RingGeometry(
        0.15,
        0.20,
        32
    );

    geometry.rotateX(-Math.PI/2);

    var material=new THREE.MeshBasicMaterial({
        color:0xffffff
    });

    reticle=new THREE.Mesh(
        geometry,
        material
    );

    reticle.matrixAutoUpdate=false;
    reticle.visible=false;

    scene.add(reticle);

    // Début de la session AR
    renderer.xr.addEventListener(
        'sessionstart',
        function(){
            hitTestSource=null;
            hitTestSourceRequested=false;
            reticle.visible=false;

            if(controls){
                controls.enabled=false;
            }
        }
    );

    // Fin de la session AR
    renderer.xr.addEventListener(
        'sessionend',
        function(){
            hitTestSource=null;
            hitTestSourceRequested=false;
            reticle.visible=false;

            if(controls){
                controls.enabled=true;
            }
        }
    );

    window.addEventListener(
        'resize',
        onWindowResize
    );

    renderer.setAnimationLoop(animate);

    // Modèle chargé au démarrage
    loadModel('1');
}

// Chargement d'un modèle .glb
function loadModel(model){
    loading_model=model;
    selected_model=model;

    var loader=new GLTFLoader();

    loader.load(
        'model/'+model+'.glb',
        function(gltf){

            // Si un autre modèle a été sélectionné
            // pendant le chargement, on ignore celui-ci
            if(loading_model!==model){
                return;
            }

            // Supprime uniquement le modèle
            // qui est en attente de placement.
            // Les modèles déjà placés restent dans la scène.
            if(current_object){
                scene.remove(current_object);
                current_object=null;
            }

            current_object=gltf.scene;
            scene.add(current_object);

            // Centre le modèle
            var box=new THREE.Box3().setFromObject(
                current_object
            );

            var center=box.getCenter(
                new THREE.Vector3()
            );

            current_object.position.sub(center);

            // Position de départ
            current_object.position.set(
                0,
                0,
                -2
            );

            current_object.visible=true;

            // Pendant l'AR, le modèle est caché
            // jusqu'à ce qu'une surface soit détectée
            if(renderer.xr.isPresenting){
                current_object.visible=false;
            }
        },
        undefined,
        function(error){
            console.error(
                'Erreur lors du chargement de '+model+'.glb',
                error
            );
        }
    );
}

// Changement de modèle depuis le menu
$('.ar-object').click(function(event){
    event.preventDefault();

    var model=$(this).attr('id');

    // Mémorise le modèle sélectionné
    selected_model=model;

    // Charge le nouveau modèle
    loadModel(model);

    closeNav();
});

// Placement d'un modèle
function onSelect(){

    // Aucun modèle à placer
    if(!current_object){
        return;
    }

    // Aucune surface détectée
    if(!reticle.visible){
        return;
    }

    // Place le modèle à l'endroit du reticle
    current_object.position.setFromMatrixPosition(
        reticle.matrix
    );

    current_object.visible=true;

    // Ajoute le modèle à la liste des modèles placés
    placed_objects.push(current_object);

    // Le modèle actuel vient d'être placé
    current_object=null;

    // Recharge automatiquement une nouvelle copie
    // du même modèle pour pouvoir le placer encore
    loadModel(selected_model);
}

// Animation et Hit Test
function animate(timestamp,frame){

    // Si aucune session AR n'est active
    if(!frame){
        renderer.render(scene,camera);
        return;
    }

    var referenceSpace=renderer.xr.getReferenceSpace();
    var session=renderer.xr.getSession();

    // Demande du Hit Test
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
        })
        .catch(function(error){
            console.error(
                'Erreur Hit Test :',
                error
            );

            hitTestSourceRequested=false;
        });
    }

    // Récupération des résultats du Hit Test
    if(hitTestSource){
        var hitTestResults=
            frame.getHitTestResults(
                hitTestSource
            );

        if(hitTestResults.length>0){
            var hit=hitTestResults[0];

            var pose=hit.getPose(
                referenceSpace
            );

            if(pose){
                reticle.visible=true;

                reticle.matrix.fromArray(
                    pose.transform.matrix
                );
            }
        }else{
            reticle.visible=false;
        }
    }

    renderer.render(scene,camera);
}

// Adaptation de la caméra lors du redimensionnement
function onWindowResize(){
    camera.aspect=
        window.innerWidth/window.innerHeight;

    camera.updateProjectionMatrix();

    if(!renderer.xr.isPresenting){
        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
}