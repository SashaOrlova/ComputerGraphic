Fungi.KBMCtrl = class{
	constructor(){
		this.canvas = Fungi.gl.canvas;
		this.initX = 0;
		this.initY = 0;
		this.prevX = 0;
		this.prevY = 0;
		this._boundMouseMove = this.onMouseMove.bind(this);
		var box = this.canvas.getBoundingClientRect();
		this.offsetX = box.left;
		this.offsetY = box.top;
		this.canvas.addEventListener("mousedown",this.onMouseDown.bind(this));
		this.canvas.addEventListener("mouseup",this.onMouseUp.bind(this));
		this.canvas.addEventListener("mousewheel", this.onMouseWheel.bind(this));
		this._activeHandler = null;
		this._handlers = {};
	}
	addHandler(name, h, active){
		this._handlers[name] = h;
		if (active == true)
			this._activeHandler = h;
		return this;
	}

	onMouseWheel(e){
		if(!this._activeHandler.onMouseWheel) return;
		e.preventDefault();
		e.stopPropagation();
		this._activeHandler.onMouseWheel(e, this, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))));
	}

	onMouseDown(e){
		e.preventDefault(); e.stopPropagation();
		this.initX = this.prevX = e.pageX - this.offsetX;
		this.initY = this.prevY = e.pageY - this.offsetY;
		if(this._activeHandler.onMouseDown) this._activeHandler.onMouseDown(e,this,this.initX,this.initY);
		this.canvas.addEventListener("mousemove",this._boundMouseMove);
	}

	onMouseMove(e){
		e.preventDefault(); e.stopPropagation();

		var x = e.pageX - this.offsetX,
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,
			dy = y - this.prevY;

		if(this._activeHandler.onMouseMove) this._activeHandler.onMouseMove(e,this,x,y,dx,dy);
		this.prevX = x;
		this.prevY = y;
	}

	onMouseUp(e){
		e.preventDefault(); e.stopPropagation();
		var x = e.pageX - this.offsetX,
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,
			dy = y - this.prevY;

		this.canvas.removeEventListener("mousemove",this._boundMouseMove);
		if(this._activeHandler.onMouseUp) this._activeHandler.onMouseUp(e,this,x,y,dx,dy);
	}
};

Fungi.KBMCtrl_Viewport = class{
	constructor(camera){
		var w = Fungi.gl.fWidth, h = Fungi.gl.fHeight;
		this.camera = camera;
		this.rotRate = -500;
		this.panRate = 5;
		this.zoomRate = 200;
		this.yRotRate = this.rotRate / w * Math.PI/180;
		this.xRotRate = this.rotRate / h * Math.PI/180;
		this.xPanRate = this.panRate / w;
		this.yPanRate = this.panRate / h;
		this.zPanRate = this.zoomRate / h;
	}
	onMouseWheel(e,ctrl,delta){ this.camera.position.z += delta * this.zPanRate; }
	onMouseMove(e,ctrl,x,y,dx,dy){
		if(!e.shiftKey){
			this.camera.euler.y += dx * this.yRotRate;
			this.camera.euler.x += dy * this.xRotRate;
		}else{
			this.camera.position.x += -dx * this.xPanRate;
			this.camera.position.y += dy * this.yPanRate;
		}
	}
}