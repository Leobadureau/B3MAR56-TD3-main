import * as THREE from 'three';

import { ARButton }
from 'three/addons/webxr/ARButton.js';

import { GLTFLoader }
from 'three/addons/loaders/GLTFLoader.js';

import { OrbitControls }
from 'three/addons/controls/OrbitControls.js';


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

var touchDown = false;
var touchX = 0;
var touchY = 0;
var deltaX = 0;
var deltaY = 0;


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


    var directionalLight =
        new THREE.DirectionalLight(
            0xffffff,
            1
        );

    directionalLight.position.set(
        0,
        1,
        1
    );

    scene.add(directionalLight);


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
        -0.2
    );

    controls.enableDamping = true;

    controls.dampingFactor = 0.05;

    controls.minDistance = 2;

    controls.maxDistance = 10;

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


            if(current_object){

                current_object.visible =
                    false;

            }


            controls.enabled = false;


            document.getElementById(
                'add-button'
            ).style.display = 'block';


            document.getElementById(
                'clear-button'
            ).style.display = 'block';

        }
    );


    renderer.xr.addEventListener(
        'sessionend',
        function(){

            hitTestSource = null;

            hitTestSourceRequested = false;

            reticle.visible = false;


            if(current_object){

                current_object.visible =
                    false;

            }


            controls.enabled = true;


            document.getElementById(
                'place-button'
            ).style.display = 'none';


            document.getElementById(
                'add-button'
            ).style.display = 'none';


            document.getElementById(
                'clear-button'
            ).style.display = 'none';

        }
    );


    renderer.domElement.addEventListener(
        'touchstart',
        function(e){

            e.preventDefault();

            touchDown = true;

            touchX =
                e.touches[0].pageX;

            touchY =
                e.touches[0].pageY;

        },
        false
    );


    renderer.domElement.addEventListener(
        'touchend',
        function(e){

            e.preventDefault();

            touchDown = false;

        },
        false
    );


    renderer.domElement.addEventListener(
        'touchmove',
        function(e){

            e.preventDefault();


            if(!touchDown){

                return;

            }


            deltaX =
                e.touches[0].pageX
                - touchX;

            deltaY =
                e.touches[0].pageY
                - touchY;


            touchX =
                e.touches[0].pageX;

            touchY =
                e.touches[0].pageY;


            rotateObject();

        },
        false
    );


    $("#place-button").click(
        function(){

            arPlace();

        }
    );


    $("#add-button").click(
        function(){

            addObject();

        }
    );


    $("#clear-button").click(
        function(){

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


        var model =
            $(this).attr('id');


        selected_model = model;


        loadModel(model);


        closeNav();

    }
);


function arPlace(){

    if(
        !current_object
    ){

        return;

    }


    if(
        !reticle.visible
    ){

        return;

    }


    current_object.position
        .setFromMatrixPosition(
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

}


function addObject(){

    if(
        !renderer.xr.isPresenting
    ){

        return;

    }


    if(current_object){

        current_object.visible =
            false;

    }


    loadModel(
        selected_model
    );

}


function clearObjects(){

    placed_objects.forEach(
        function(object){

            scene.remove(
                object
            );

        }
    );


    placed_objects = [];


    if(current_object){

        scene.remove(
            current_object
        );

        current_object = null;

    }


    if(
        renderer.xr.isPresenting
    ){

        loadModel(
            selected_model
        );

    }

}


function rotateObject(){

    if(
        current_object &&
        reticle.visible
    ){

        current_object.rotation.y +=
            deltaX / 100;

    }

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


    if(
        !hitTestSourceRequested
    ){

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


        if(
            hitTestResults.length > 0
        ){

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

                }else{

                    document.getElementById(
                        'place-button'
                    ).style.display =
                        'none';

                }

            }

        }else{

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


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}