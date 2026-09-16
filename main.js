import * as THREE from 'three';

import { ARButton }
from 'three/addons/webxr/ARButton.js';

import { GLTFLoader }
from 'three/addons/webxr/GLTFLoader.js';

import { OrbitControls }
from 'three/addons/webxr/OrbitControls.js';

import { HDRLoader }
from 'three/addons/webxr/HDRLoader.js';


var scene;
var camera;
var renderer;

var reticle;
var controls;

var hitTestSource = null;
var hitTestSourceRequested = false;

var current_object = null;
var loading_model = null;

var selected_model = '1';

var placed_objects = [];


init();


function init(){

    scene = new THREE.Scene();


    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );


    var light = new THREE.HemisphereLight(
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


    var options = {

        requiredFeatures: [
            'hit-test'
        ],

        optionalFeatures: [
            'dom-overlay'
        ],

        domOverlay: {

            root:
                document.getElementById(
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


    var geometry =
        new THREE.RingGeometry(
            0.15,
            0.20,
            32
        );


    geometry.rotateX(
        -Math.PI / 2
    );


    var material =
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


    renderer.xr.addEventListener(
        'sessionstart',
        function(){

            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            document.getElementById(
                'place-button'
            ).style.display = 'none';


            document.getElementById(
                'clear-button'
            ).style.display = 'block';


            if(controls){

                controls.enabled = false;

            }

        }
    );


    renderer.xr.addEventListener(
        'sessionend',
        function(){

            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            document.getElementById(
                'place-button'
            ).style.display = 'none';


            document.getElementById(
                'clear-button'
            ).style.display = 'none';


            if(controls){

                controls.enabled = true;

            }

        }
    );


    document.getElementById(
        'place-button'
    ).addEventListener(
        'click',
        function(event){

            event.stopPropagation();

            arPlace();

        }
    );


    document.getElementById(
        'clear-button'
    ).addEventListener(
        'click',
        function(event){

            event.stopPropagation();

            clearObjects();

        }
    );


    window.addEventListener(
        'resize',
        onWindowResize
    );


    renderer.setAnimationLoop(
        animate
    );


    loadModel('1');

}


function loadModel(model){

    loading_model = model;

    selected_model = model;


    var loader =
        new GLTFLoader();


    loader.load(

        'model/' + model + '.glb',

        function(gltf){

            if(
                loading_model !== model
            ){

                return;

            }


            if(current_object){

                scene.remove(
                    current_object
                );

                current_object = null;

            }


            current_object =
                gltf.scene;


            scene.add(
                current_object
            );


            var box =
                new THREE.Box3()
                .setFromObject(
                    current_object
                );


            var center =
                box.getCenter(
                    new THREE.Vector3()
                );


            current_object.position.sub(
                center
            );


            current_object.position.set(
                0,
                0,
                -2
            );


            current_object.visible = true;


            if(
                renderer.xr.isPresenting
            ){

                current_object.visible =
                    false;

            }

        },

        undefined,

        function(error){

            console.error(
                'Erreur lors du chargement de '
                + model
                + '.glb',
                error
            );

        }

    );

}


$('.ar-object').click(
    function(event){

        event.preventDefault();

        event.stopPropagation();


        var model =
            $(this).attr('id');


        selected_model = model;


        loadModel(model);


        closeNav();

    }
);


function arPlace(){

    if(!renderer.xr.isPresenting){

        return;

    }


    if(!current_object){

        return;

    }


    if(!reticle.visible){

        return;

    }


    current_object.position.setFromMatrixPosition(
        reticle.matrix
    );


    current_object.visible = true;


    placed_objects.push(
        current_object
    );


    current_object = null;


    document.getElementById(
        'place-button'
    ).style.display = 'none';


    loadModel(
        selected_model
    );

}


function clearObjects(){

    for(
        var i = 0;
        i < placed_objects.length;
        i++
    ){

        scene.remove(
            placed_objects[i]
        );

    }


    placed_objects = [];


    if(current_object){

        scene.remove(
            current_object
        );

        current_object = null;

    }


    document.getElementById(
        'place-button'
    ).style.display = 'none';


    loadModel(
        selected_model
    );

}


function animate(
    timestamp,
    frame
){

    if(!frame){

        renderer.render(
            scene,
            camera
        );

        return;

    }


    var referenceSpace =
        renderer.xr.getReferenceSpace();


    var session =
        renderer.xr.getSession();


    if(!hitTestSourceRequested){

        hitTestSourceRequested = true;


        session
            .requestReferenceSpace(
                'viewer'
            )

            .then(
                function(viewerSpace){

                    return session
                        .requestHitTestSource({

                            space:
                                viewerSpace

                        });

                }
            )

            .then(
                function(source){

                    hitTestSource =
                        source;

                }
            )

            .catch(
                function(error){

                    console.error(
                        'Erreur Hit Test :',
                        error
                    );


                    hitTestSourceRequested =
                        false;

                }
            );

    }


    if(hitTestSource){

        var hitTestResults =
            frame.getHitTestResults(
                hitTestSource
            );


        if(hitTestResults.length > 0){

            var hit =
                hitTestResults[0];


            var pose =
                hit.getPose(
                    referenceSpace
                );


            if(pose){

                reticle.visible = true;


                reticle.matrix.fromArray(
                    pose.transform.matrix
                );


                if(current_object){

                    document.getElementById(
                        'place-button'
                    ).style.display =
                        'block';

                }
                else{

                    document.getElementById(
                        'place-button'
                    ).style.display =
                        'none';

                }

            }

        }
        else{

            reticle.visible = false;


            document.getElementById(
                'place-button'
            ).style.display =
                'none';

        }

    }


    renderer.render(
        scene,
        camera
    );

}


function onWindowResize(){

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    if(!renderer.xr.isPresenting){

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }

}