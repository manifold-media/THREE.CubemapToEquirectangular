(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
( function() {

var vertexShader = `
attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 vUv;

void main()  {

	vUv = vec2( 1.- uv.x, uv.y );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;

var fragmentShader = `
precision mediump float;

uniform samplerCube map;

varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main()  {

	vec2 uv = vUv;

	float longitude = uv.x * 2. * M_PI - M_PI + M_PI / 2.;
	float latitude = uv.y * M_PI;

	vec3 dir = vec3(
		- sin( longitude ) * sin( latitude ),
		cos( latitude ),
		- cos( longitude ) * sin( latitude )
	);
	normalize( dir );

	gl_FragColor = vec4( textureCube( map, dir ).rgb, 1. );

}
`;

function CubemapToEquirectangular( renderer, provideCubeCamera ) {

	this.width = 1;
	this.height = 1;

	this.renderer = renderer;

	this.material = new THREE.RawShaderMaterial( {
		uniforms: {
			map: { type: 't', value: null }
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.DoubleSide
	} );

	this.scene = new THREE.Scene();
	this.quad = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 1, 1 ),
		this.material
	);
	this.scene.add( this.quad );
	this.camera = new THREE.OrthographicCamera( 1 / - 2, 1 / 2, 1 / 2, 1 / - 2, -10000, 10000 );

	this.canvas = document.createElement( 'canvas' );
	this.ctx = this.canvas.getContext( '2d' );

	this.cubeCamera = null;
	this.attachedCamera = null;

	this.setSize( 4096, 2048 );

	var gl = this.renderer.getContext();
	this.cubeMapSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE )

	if( provideCubeCamera ) {
		this.getCubeCamera( 2048 )
	}

}

CubemapToEquirectangular.prototype.setSize = function( width, height ) {

	this.width = width;
	this.height = height;

	this.quad.scale.set( this.width, this.height, 1 );

	this.camera.left = this.width / - 2;
	this.camera.right = this.width / 2;
	this.camera.top = this.height / 2;
	this.camera.bottom = this.height / - 2;

	this.camera.updateProjectionMatrix();

	this.output = new THREE.WebGLRenderTarget( this.width, this.height, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		wrapS: THREE.ClampToEdgeWrapping,
		wrapT: THREE.ClampToEdgeWrapping,
		format: THREE.RGBAFormat,
		type: THREE.UnsignedByteType
	});

	this.canvas.width = this.width;
	this.canvas.height = this.height;

}

CubemapToEquirectangular.prototype.getCubeCamera = function( size ) {

	this.cubeCamera = new THREE.CubeCamera( .1, 1000, Math.min( this.cubeMapSize, size ) );
	return this.cubeCamera;

}

CubemapToEquirectangular.prototype.attachCubeCamera = function( camera ) {

	this.getCubeCamera();
	this.attachedCamera = camera;

}

CubemapToEquirectangular.prototype.convert = function( cubeCamera ) {

	this.quad.material.uniforms.map.value = cubeCamera.renderTarget.texture;
	this.renderer.render( this.scene, this.camera, this.output, true );

	var pixels = new Uint8Array( 4 * this.width * this.height );
	this.renderer.readRenderTargetPixels( this.output, 0, 0, this.width, this.height, pixels );

	var imageData = new ImageData( new Uint8ClampedArray( pixels ), this.width, this.height );

	this.ctx.putImageData( imageData, 0, 0 );

	this.canvas.toBlob( function( blob ) {

		var url = URL.createObjectURL(blob);
		var fileName = 'pano-' + document.title + '-' + Date.now() + '.png';
		var anchor = document.createElement( 'a' );
		anchor.href = url;
		anchor.setAttribute("download", fileName);
		anchor.className = "download-js-link";
		anchor.innerHTML = "downloading...";
		anchor.style.display = "none";
		document.body.appendChild(anchor);
		setTimeout(function() {
			anchor.click();
			document.body.removeChild(anchor);
		}, 1 );

	}, 'image/png' );

}

CubemapToEquirectangular.prototype.update = function( camera, scene ) {

	var autoClear = this.renderer.autoClear;
	this.renderer.autoClear = true;
	this.cubeCamera.position.copy( camera.position );
	this.cubeCamera.updateCubeMap( this.renderer, scene );
	this.renderer.autoClear = autoClear;

	this.convert( this.cubeCamera );

}

window.THREE.CubemapToEquirectangular = CubemapToEquirectangular;

} )();

},{}]},{},[1]);

},{}],2:[function(require,module,exports){
require('../build/CubemapToEquirectangular.js');

var equi;

var container, stats;
var camera, scene, renderer;
var controls;

var radius = 100, theta = 0;

window.addEventListener( 'load', function() {
	init();
	animate();
});

var cubeCamera;
var sphere;

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 1,1,1 );

	scene = new THREE.Scene();

	var light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );

	var geometry = new THREE.BoxBufferGeometry( 20, 20, 20 );

	for ( var i = 0; i < 2000; i ++ ) {

		var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

		object.position.x = Math.random() * 800 - 400;
		object.position.y = Math.random() * 800 - 400;
		object.position.z = Math.random() * 800 - 400;

		object.rotation.x = Math.random() * 2 * Math.PI;
		object.rotation.y = Math.random() * 2 * Math.PI;
		object.rotation.z = Math.random() * 2 * Math.PI;

		object.scale.x = Math.random() + 0.5;
		object.scale.y = Math.random() + 0.5;
		object.scale.z = Math.random() + 0.5;

		object.material.color.setRGB( object.position.x / 800 + .5, object.position.y / 800 + .5, object.position.z / 800 + .5 );

		scene.add( object );

	}

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.sortObjects = false;
	container.appendChild(renderer.domElement);

	equi = new THREE.CubemapToEquirectangular( renderer, false );
	cubeCamera = new THREE.CubeCamera( .1, 1000, 2048 );

	controls = new THREE.OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize();

	document.getElementById( 'capture' ).addEventListener( 'click', function( e ) {

		cubeCamera.position.copy( camera.position );
		cubeCamera.updateCubeMap( renderer, scene );
		equi.convert( cubeCamera );

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}


function animate() {

	requestAnimationFrame( animate );

	controls.update();
	render();

}

function render() {

	renderer.render( scene, camera );

}

},{"../build/CubemapToEquirectangular.js":1}]},{},[2]);
