FungiApp = {
	renderLoop		:null,
	mainCamera		:null,
	ctrlCamera		:null,
	debugLines		:null,
	gridFloor		:null,
	uboTransform	:null,
	scene			:[],

	startup:function(){
		Fungi.Init("FungiCanvas").fClearColor("FFFFF1").fFitScreen(1,1).fClear();
		this.uboTransform	= Fungi.Shaders.UBO.createTransformUBO();
		this.mainCamera		= new Fungi.CameraOrbit().setPosition(0,0.5,5).setEulerDegrees(-15,45,0);
		this.ctrlCamera		= new Fungi.KBMCtrl().addHandler("camera",new Fungi.KBMCtrl_Viewport(this.mainCamera),true);
		this.renderLoop		= new Fungi.RenderLoop(onRender);
	},

	update:function(){
		this.mainCamera.update();
		Fungi.gl.fClear();
	}
};