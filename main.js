import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/webxr/OrbitControls.js';
import { GLTFLoader } from 'three/addons/webxr/GLTFLoader.js';
import { HDRLoader } from 'three/addons/webxr/HDRLoader.js';


let scene;
let camera;
let renderer;
let reticle;
let controller;
let controls;

let hitTestSource = null;
let hitTestSourceRequested = false;

let current_object = null;
let current_url = "1";
let loading_model = null;


// --------------------------------------------------
// INITIALISATION
// --------------------------------------------------

init();


function init() {

    // SCENE
    scene = new THREE.Scene();
    scene.background = null;


    // CAMERA
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );


    // LUMIÈRE
    const light = new THREE.HemisphereLight(
        0xffffff,
        0xbbbbff,
        3
    );

    light.position.set(0.5, 1, 0.25);
    scene.add(light);


    // RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Fond transparent pour laisser apparaître la caméra AR
    renderer.setClearAlpha(0);

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');

    document.body.appendChild(renderer.domElement);


    // --------------------------------------------------
    // ORBIT CONTROLS
    // --------------------------------------------------

    controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.target.set(0, 0, 0);
    controls.update();


    // --------------------------------------------------
    // CONTROLLER AR
    // --------------------------------------------------

    controller = renderer.xr.getController(0);

    controller.addEventListener(
        'select',
        onSelect
    );

    scene.add(controller);


    // --------------------------------------------------
    // BOUTON AR
    // --------------------------------------------------

    const options = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay']
    };

    options.domOverlay = {
        root: document.getElementById('content')
    };

    const arButton = ARButton.createButton(
        renderer,
        options
    );

    document.body.appendChild(arButton);


    // --------------------------------------------------
    // RETICULE
    // --------------------------------------------------

    const geometry = new THREE.RingGeometry(
        0.15,
        0.20,
        32
    );

    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });

    reticle = new THREE.Mesh(
        geometry,
        material
    );

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;

    scene.add(reticle);


    // --------------------------------------------------
    // REDIMENSIONNEMENT
    // --------------------------------------------------

    window.addEventListener(
        'resize',
        onWindowResize
    );


    // --------------------------------------------------
    // DÉTECTION DU DÉBUT DE L'AR
    // --------------------------------------------------

    renderer.xr.addEventListener(
        'sessionstart',
        function () {

            // On cache le modèle au début de l'AR
            if (current_object) {
                current_object.visible = false;
            }

            // Désactive les contrôles souris pendant l'AR
            if (controls) {
                controls.enabled = false;
            }
        }
    );


    // --------------------------------------------------
    // DÉTECTION DE LA FIN DE L'AR
    // --------------------------------------------------

    renderer.xr.addEventListener(
        'sessionend',
        function () {

            hitTestSourceRequested = false;
            hitTestSource = null;

            reticle.visible = false;

            // Réactive les contrôles sur ordinateur
            if (controls) {
                controls.enabled = true;
            }

            // On remet le modèle devant la caméra sur ordinateur
            if (current_object) {

                current_object.visible = true;

                current_object.position.set(
                    0,
                    0,
                    -2
                );
            }
        }
    );


    // --------------------------------------------------
    // BOUCLE DE RENDU
    // --------------------------------------------------

    renderer.setAnimationLoop(
        animate
    );


    // --------------------------------------------------
    // CHARGEMENT DU MODÈLE PAR DÉFAUT
    // --------------------------------------------------

    loadModel("1");
}


// --------------------------------------------------
// CHARGER UN MODÈLE
// --------------------------------------------------

function loadModel(model) {

    current_url = model;
    loading_model = model;


    // Supprime l'ancien modèle
    if (current_object) {

        scene.remove(current_object);

        current_object = null;
    }


    const loader = new GLTFLoader();


    loader.load(
        'model/' + model + '.glb',

        function (gltf) {

            // Évite qu'un ancien chargement écrase
            // le modèle actuellement sélectionné
            if (loading_model !== model) {
                return;
            }


            current_object = gltf.scene;


            // Ajout dans la scène
            scene.add(current_object);


            // --------------------------------------------------
            // CENTRAGE DU MODÈLE
            // --------------------------------------------------

            const box = new THREE.Box3().setFromObject(
                current_object
            );

            const center = box.getCenter(
                new THREE.Vector3()
            );

            current_object.position.sub(
                center
            );


            // --------------------------------------------------
            // POSITION SUR ORDINATEUR
            // --------------------------------------------------

            current_object.position.set(
                0,
                0,
                -2
            );

            current_object.visible = true;


            // Mise à jour des contrôles
            controls.target.set(
                0,
                0,
                0
            );

            controls.update();


            // Si on est déjà en AR,
            // le modèle reste caché jusqu'au placement
            if (renderer.xr.isPresenting) {
                current_object.visible = false;
            }
        },

        undefined,

        function (error) {

            console.error(
                'Erreur lors du chargement de ' +
                model +
                '.glb',
                error
            );
        }
    );
}


// --------------------------------------------------
// MENU : CHOIX DU MODÈLE
// --------------------------------------------------

$(".ar-object").click(function (event) {

    event.preventDefault();


    const selected_model = $(this).attr('id');


    current_url = selected_model;


    // On peut changer de modèle uniquement
    // hors session AR
    if (!renderer.xr.isPresenting) {

        loadModel(
            selected_model
        );
    }


    closeNav();
});


// --------------------------------------------------
// PLACER LE MODÈLE EN AR
// --------------------------------------------------

function onSelect() {

    // Pas de modèle
    if (!current_object) {
        return;
    }


    // Pas de surface détectée
    if (!reticle.visible) {
        return;
    }


    // Place le modèle à l'endroit du réticule
    current_object.position.setFromMatrixPosition(
        reticle.matrix
    );


    // Affiche le modèle
    current_object.visible = true;
}


// --------------------------------------------------
// ANIMATION / HIT TEST
// --------------------------------------------------

function animate(timestamp, frame) {

    // Hors AR
    if (!frame) {

        renderer.render(
            scene,
            camera
        );

        return;
    }


    const referenceSpace =
        renderer.xr.getReferenceSpace();

    const session =
        renderer.xr.getSession();


    // --------------------------------------------------
    // DEMANDE DU HIT TEST
    // --------------------------------------------------

    if (!hitTestSourceRequested) {

        hitTestSourceRequested = true;


        session
            .requestReferenceSpace('viewer')

            .then(function (viewerSpace) {

                return session.requestHitTestSource({
                    space: viewerSpace
                });
            })

            .then(function (source) {

                hitTestSource = source;
            })

            .catch(function (error) {

                console.error(
                    'Impossible d’activer le Hit Test :',
                    error
                );
            });
    }


    // --------------------------------------------------
    // RÉSULTATS DU HIT TEST
    // --------------------------------------------------

    if (hitTestSource) {

        const hitTestResults =
            frame.getHitTestResults(
                hitTestSource
            );


        if (hitTestResults.length > 0) {

            const hit =
                hitTestResults[0];


            const pose =
                hit.getPose(
                    referenceSpace
                );


            if (pose) {

                reticle.visible = true;

                reticle.matrix.fromArray(
                    pose.transform.matrix
                );
            }

        } else {

            reticle.visible = false;
        }
    }


    // --------------------------------------------------
    // RENDU
    // --------------------------------------------------

    renderer.render(
        scene,
        camera
    );
}


// --------------------------------------------------
// REDIMENSIONNEMENT
// --------------------------------------------------

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();


    // Évite l'erreur Three.js pendant l'AR
    if (!renderer.xr.isPresenting) {

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
}