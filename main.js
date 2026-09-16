import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/webxr/GLTFLoader.js';
import { OrbitControls } from 'three/addons/webxr/OrbitControls.js';
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
let loading_model = null;


// --------------------------------------------------
// INITIALISATION
// --------------------------------------------------

init();


function init() {

    // SCENE
    scene = new THREE.Scene();


    // CAMERA
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );


    // LUMIERE
    const light = new THREE.HemisphereLight(
        0xffffff,
        0xbbbbff,
        3
    );

    light.position.set(
        0.5,
        1,
        0.25
    );

    scene.add(light);


    // RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        window.devicePixelRatio
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.xr.enabled = true;

    document.body.appendChild(
        renderer.domElement
    );


    // --------------------------------------------------
    // CONTROLS POUR ORDINATEUR
    // --------------------------------------------------

    controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.target.set(
        0,
        0,
        0
    );

    controls.update();


    // --------------------------------------------------
    // CONTROLLER
    // --------------------------------------------------

    controller = renderer.xr.getController(0);

    controller.addEventListener(
        'select',
        onSelect
    );

    scene.add(controller);


    // --------------------------------------------------
    // AR BUTTON
    // --------------------------------------------------

    const options = {
        requiredFeatures: [
            'hit-test'
        ],

        optionalFeatures: [
            'dom-overlay'
        ],

        domOverlay: {
            root: document.getElementById(
                'content'
            )
        }
    };


    document.body.appendChild(
        ARButton.createButton(
            renderer,
            options
        )
    );


    // --------------------------------------------------
    // RETICULE
    // --------------------------------------------------

    const geometry =
        new THREE.RingGeometry(
            0.15,
            0.20,
            32
        );

    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial({
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
    // SESSION AR
    // --------------------------------------------------

    renderer.xr.addEventListener(
        'sessionstart',
        function () {

            hitTestSource = null;
            hitTestSourceRequested = false;

            reticle.visible = false;


            // Cache le modèle au début de l'AR
            if (current_object) {
                current_object.visible = false;
            }


            // Désactive OrbitControls
            if (controls) {
                controls.enabled = false;
            }
        }
    );


    renderer.xr.addEventListener(
        'sessionend',
        function () {

            hitTestSource = null;
            hitTestSourceRequested = false;

            reticle.visible = false;


            // Réactive les contrôles PC
            if (controls) {
                controls.enabled = true;
            }


            // Remet le modèle devant la caméra
            if (current_object) {

                current_object.position.set(
                    0,
                    0,
                    -2
                );

                current_object.visible = true;
            }
        }
    );


    // --------------------------------------------------
    // RESIZE
    // --------------------------------------------------

    window.addEventListener(
        'resize',
        onWindowResize
    );


    // --------------------------------------------------
    // ANIMATION
    // --------------------------------------------------

    renderer.setAnimationLoop(
        animate
    );


    // --------------------------------------------------
    // MODELE PAR DEFAUT
    // --------------------------------------------------

    loadModel('1');
}


// --------------------------------------------------
// CHARGEMENT DU MODELE
// --------------------------------------------------

function loadModel(model) {

    loading_model = model;


    // Supprime l'ancien modèle
    if (current_object) {

        scene.remove(
            current_object
        );

        current_object = null;
    }


    const loader =
        new GLTFLoader();


    loader.load(

        'model/' + model + '.glb',

        function (gltf) {

            // Vérifie que c'est toujours
            // le modèle demandé
            if (loading_model !== model) {
                return;
            }


            current_object =
                gltf.scene;


            // Ajout à la scène
            scene.add(
                current_object
            );


            // --------------------------------------------------
            // CENTRAGE
            // --------------------------------------------------

            const box =
                new THREE.Box3()
                    .setFromObject(
                        current_object
                    );


            const center =
                box.getCenter(
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


            // Pendant l'AR, on le cache
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
// MENU
// --------------------------------------------------

$('.ar-object').click(
    function (event) {

        event.preventDefault();

        const model =
            $(this).attr('id');

        // On peut changer de modèle
        // même pendant l'AR
        loadModel(model);

        closeNav();
    }
);


// --------------------------------------------------
// PLACEMENT AR
// --------------------------------------------------

function onSelect() {

    if (!current_object) {
        return;
    }


    if (!reticle.visible) {
        return;
    }


    // Position du modèle
    // sur la surface détectée
    current_object.position.setFromMatrixPosition(
        reticle.matrix
    );


    // Affiche le modèle
    current_object.visible = true;
}


// --------------------------------------------------
// ANIMATION
// --------------------------------------------------

function animate(
    timestamp,
    frame
) {

    // --------------------------------------------------
    // MODE NORMAL / PC
    // --------------------------------------------------

    if (!frame) {

        renderer.render(
            scene,
            camera
        );

        return;
    }


    // --------------------------------------------------
    // AR
    // --------------------------------------------------

    const referenceSpace =
        renderer.xr.getReferenceSpace();


    const session =
        renderer.xr.getSession();


    // --------------------------------------------------
    // DEMANDE HIT TEST
    // --------------------------------------------------

    if (!hitTestSourceRequested) {

        hitTestSourceRequested = true;


        session
            .requestReferenceSpace(
                'viewer'
            )

            .then(
                function (viewerSpace) {

                    return session
                        .requestHitTestSource({
                            space: viewerSpace
                        });
                }
            )

            .then(
                function (source) {

                    hitTestSource =
                        source;
                }
            )

            .catch(
                function (error) {

                    console.error(
                        'Erreur Hit Test :',
                        error
                    );

                    hitTestSourceRequested =
                        false;
                }
            );
    }


    // --------------------------------------------------
    // HIT TEST
    // --------------------------------------------------

    if (hitTestSource) {

        const hitTestResults =
            frame.getHitTestResults(
                hitTestSource
            );


        if (
            hitTestResults.length > 0
        ) {

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
// RESIZE
// --------------------------------------------------

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();


    // Important :
    // ne pas appeler setSize pendant l'AR
    if (!renderer.xr.isPresenting) {

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
}