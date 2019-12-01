FungiApp = {
	renderLoop		:null,
	mainCamera		:null,
	ctrlCamera		:null,
	debugLines		:null,
	gridFloor		:null,
	uboTransform	:null,
	UTine 		: 0.0,
	delta			: 0.05,
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
			FungiApp.tryes = 10;
			FungiApp.UTine += FungiApp.delta;
		}
		return FungiApp.UTine;
	},
	startup:function(){
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

	loadTexture(url) {
	if (FungiApp.image) {
		return;
	}
	var gl = Fungi.gl;
	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	const level = 0;
	const internalFormat = gl.RGBA;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
		new Uint8Array([0, 0, 255, 255]));

	FungiApp.image = new Image();
	FungiApp.image.crossOrigin = "anonymous";
	FungiApp.image.src = url;
	FungiApp.image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, FungiApp.image);
		if (FungiApp.isPowerOf2(FungiApp.image.width) && FungiApp.isPowerOf2(FungiApp.image.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};

	return texture;
},

	isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}
};