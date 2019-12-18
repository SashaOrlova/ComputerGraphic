FungiApp = {
	renderLoop		:null,
	mainCamera		:null,
	ctrlCamera		:null,
	debugLines		:null,
	gridFloor		:null,
	LOADING_MANAGER : null,
	OBJ_LOADER: null,
	uboTransform	:null,
	UTine 		: 0.0,
	delta			: 0.0005,
	tryes 		: 10,
	scene			:[],
	image 		: null,

	getUTime: function() {
		if (FungiApp.UTine >= 1 || FungiApp.UTine < 0) {
			FungiApp.delta *= -1;
			FungiApp.tryes = 1;
		}

		FungiApp.tryes--;
		if (FungiApp.tryes == 0) {
			FungiApp.tryes = 1;
			FungiApp.UTine += FungiApp.delta;
		}
		return FungiApp.UTine;
	},
	getNeedTexture: function() {
		var checkBox = document.getElementById("myCheck");
		return checkBox.checked;
	},
	startup:function(){
		FungiApp.initLoaders();
		FungiApp.loadModel();
		Fungi.Init("FungiCanvas").fClearColor("FFFFFF").fFitScreen(1,1).fClear();
		this.uboTransform	= Fungi.Shaders.UBO.createTransformUBO();
		this.mainCamera		= new Fungi.CameraOrbit().setPosition(0,0.5,5).setEulerDegrees(-15,45,0);
		this.ctrlCamera		= new Fungi.KBMCtrl().addHandler("camera",new Fungi.KBMCtrl_Viewport(this.mainCamera),true);
		this.renderLoop		= new Fungi.RenderLoop(onRender);
	},

	update:function(){
		this.mainCamera.update();
		Fungi.gl.fClear();
	},

	getRandomInt: function(max) {
	return Math.floor(Math.random() * Math.floor(max));
	},

	loadTexture() {
		if (this.image) {
			return
		}
		this.image = true;

		var gl = Fungi.gl;
		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, texture);

		SIZE = 64;
		var data = new Uint8Array(SIZE * SIZE * SIZE * 4);
		for (var i = 0; i < SIZE*SIZE*SIZE; i+=4) {
			current = this.getRandomInt(256);
			data[i] = current;
			data[i + 1] = current;
			data[i + 2] = current;
			data[i + 3] = current;
		}
		gl.bindTexture(gl.TEXTURE_3D, texture);

		gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, SIZE, SIZE, SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		if (FungiApp.isPowerOf2(SIZE) && FungiApp.isPowerOf2(SIZE)) {
			gl.generateMipmap(gl.TEXTURE_3D);
		} else {
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}

	return texture;
},

	isPowerOf2(value) {
	return (value & (value - 1)) == 0;
},
	initLoaders() {
		
},
	loadModel() {
		let loader = new THREE.OBJLoader();
		var modelInfo = {};
		obj = loader.parse(objStr);
		modelInfo.obj = obj;
		modelInfo.vertices = obj.children[0].geometry.attributes.position.array;
		modelInfo.vertexNormals = obj.children[0].geometry.attributes.normal.array;
		modelInfo.indices = new Uint32Array([...Array(modelInfo.vertices.length / 3).keys()]);
		return modelInfo;
	},
};