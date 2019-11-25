var Fungi = (function(){
	const DEG2RAD = Math.PI/180;

	var	gl = null,
		CULLING_STATE = true,
		BLENDING_STATE = false,
		DEPTHTEST_STATE = true;

	function Init(canvasID){
		if(Fungi.gl != null) return Fungi.gl;

		var canvas = document.getElementById(canvasID);
		gl = canvas.getContext("webgl2");
		if(!gl){ console.error("WebGL context is not available."); return null; }

		gl.cullFace(gl.BACK);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.depthFunc(gl.LEQUAL);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.fClear = function(){ this.clear(this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT); return this; };
		gl.fClearColor = function(hex){
			var a = Util.rgbArray(hex);
			gl.clearColor(a[0],a[1],a[2],1.0);
			return this;
		};
		gl.fCreateArrayBuffer = function(floatAry,isStatic,isUnbind){
			if(isStatic === undefined)
				isStatic = true;

			var buf = this.createBuffer();
			this.bindBuffer(this.ARRAY_BUFFER,buf);
			this.bufferData(this.ARRAY_BUFFER, floatAry, (isStatic)? this.STATIC_DRAW : this.DYNAMIC_DRAW );
			if(isUnbind != false) this.bindBuffer(this.ARRAY_BUFFER,null);
			return buf;
		};
		gl.fSetSize = function(w,h){
			this.canvas.style.width = w + "px";
			this.canvas.style.height = h + "px";
			this.canvas.width = w;
			this.canvas.height = h;

			this.viewport(0,0,w,h);
			this.fWidth = w;
			this.fHeight = h;
			return this;
		}
		gl.fFitScreen = function(wp,hp){ return this.fSetSize(window.innerWidth * (wp || 1),window.innerHeight * (hp || 1)); }
		return Fungi.gl = gl;
	}

	class Util{
		static rgbArray(){
			if(arguments.length == 0) return null;
			var rtn = [];

			for(var i=0,c,p; i < arguments.length; i++){
				if(arguments[i].length < 6) continue;
				c = arguments[i];
				p = (c[0] == "#")?1:0;

				rtn.push(
					parseInt(c[p]	+c[p+1],16)	/ 255.0,
					parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
					parseInt(c[p+4]	+c[p+5],16)	/ 255.0
				);
			}
			return rtn;
		}
	}

	class Transform{
		constructor(){
			this.position = new Vec3(0);
			this.scale = new Vec3(1);
			this.rotation = new Quaternion();
			this.localMatrix = new Matrix4();
		}
		setPosition(x,y,z){	this.position.set(x,y,z);	return this; }
		updateMatrix(){
			if(!this.position.isModified && !this.scale.isModified && !this.rotation.isModified) return this.localMatrix;
			Matrix4.fromQuaternionTranslationScale(this.localMatrix, this.rotation, this.position, this.scale);
			this.position.isModified	= false;
			this.scale.isModified		= false;
			this.rotation.isModified	= false;
			return this.localMatrix;
		}
	}

	class Renderable extends Transform {
		constructor(vao,matName){
			super();
			this.vao = vao;
			this.visible = true;
			this.material = (matName != null && matName !== undefined)? Fungi.Res.Materials[matName] : null;
		}
		draw(){
			if(this.vao.count == 0) return;
			gl.bindVertexArray(this.vao.id);
			if (this.vao.isIndexed) {
				gl.drawElements(this.material.drawMode, this.vao.count, gl.UNSIGNED_SHORT, 0);
			}
			else
				gl.drawArrays(this.material.drawMode, 0, this.vao.count);
		}
	}

	class CameraOrbit extends Transform {
		constructor(fov,near,far){
			super();
			this.ubo = Fungi.Res.Ubo[Fungi.UBO_TRANSFORM];
			this.projectionMatrix = new Float32Array(16);
			this.invertedLocalMatrix = new Float32Array(16);

			var ratio = gl.canvas.width / gl.canvas.height;
			Matrix4.perspective(this.projectionMatrix, fov || 45, ratio, near || 0.1, far || 100.0);
			this.ubo.update("matProjection",this.projectionMatrix); //Initialize The Transform UBO.

			this.euler = new Vec3();
		}

		updateMatrix(){
			Quaternion.setFromEuler(this.rotation,this.euler.x,this.euler.y,this.euler.z);
			Matrix4.fromQuaternion(this.localMatrix,this.rotation);
			this.localMatrix.resetTranslation().translate(this.position);
			this.position.isModified	= false;
			this.rotation.isModified	= false;
			this.euler.isModified		= false;
			return this.localMatrix;
		}

		update(){
			if(this.position.isModified || this.scale.isModified || this.euler.isModified) this.updateMatrix();
			Matrix4.invert(this.invertedLocalMatrix,this.localMatrix);
			this.ubo.update("matCameraView",this.invertedLocalMatrix,"posCamera",this.position);
		}

		setEulerDegrees(x,y,z){ this.euler.set(x * DEG2RAD,y * DEG2RAD,z * DEG2RAD); return this; }
	}

	class Vec3 extends Float32Array{
		constructor(ini){
			super(3);
			if(ini instanceof Vec3 || (ini && ini.length == 3)){
				this[0] = ini[0]; this[1] = ini[1]; this[2] = ini[2];
			}else if(arguments.length == 3){
				this[0] = arguments[0]; this[1] = arguments[1]; this[2] = arguments[2];
			}else{
				this[0] = this[1] = this[2] = ini || 0;
			}
			this.isModified = true;
		}
			set(x,y,z) { this[0] = x; this[1] = y; this[2] = z; this.isModified = true; return this;}

			get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
			get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }
			get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true; }
	}

	class Quaternion extends Float32Array{
		constructor(){
			super(4);
			this[0] = this[1] = this[2] = 0;
			this[3] = 1;
			this.isModified = false;
		}
			get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
			get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }
			get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true; }
			static setFromEuler(out,x,y,z){
				var c1 = Math.cos(x/2),
					c2 = Math.cos(y/2),
					c3 = Math.cos(z/2),
					s1 = Math.sin(x/2),
					s2 = Math.sin(y/2),
					s3 = Math.sin(z/2);
					out[0] = s1 * c2 * c3 + c1 * s2 * s3;
					out[1] = c1 * s2 * c3 - s1 * c2 * s3;
					out[2] = c1 * c2 * s3 - s1 * s2 * c3;
					out[3] = c1 * c2 * c3 + s1 * s2 * s3;
			}
	}

	class Matrix4 extends Float32Array{
		constructor(){ super(16); this[0] = this[5] = this[10] = this[15] = 1; }  //Setup Identity

			translate(ary){	Matrix4.translate(this,ary[0],ary[1],ary[2]); return this;}
			resetTranslation(){ this[12] = this[13] = this[14] = 0; this[15] = 1; return this; }

			static perspective(out, fovy, aspect, near, far){
				var f = 1.0 / Math.tan(fovy / 2),
					nf = 1 / (near - far);
				out[0] = f / aspect;
				out[1] = 0;
				out[2] = 0;
				out[3] = 0;
				out[4] = 0;
				out[5] = f;
				out[6] = 0;
				out[7] = 0;
				out[8] = 0;
				out[9] = 0;
				out[10] = (far + near) * nf;
				out[11] = -1;
				out[12] = 0;
				out[13] = 0;
				out[14] = (2 * far * near) * nf;
				out[15] = 0;
			}

			static fromQuaternion(out, q){
				var x = q[0], y = q[1], z = q[2], w = q[3],
					x2 = x + x,
					y2 = y + y,
					z2 = z + z,

					xx = x * x2,
					xy = x * y2,
					xz = x * z2,
					yy = y * y2,
					yz = y * z2,
					zz = z * z2,
					wx = w * x2,
					wy = w * y2,
					wz = w * z2;

				out[0] = 1 - (yy + zz);
				out[1] = xy + wz;
				out[2] = xz - wy;
				out[3] = 0;
				out[4] = xy - wz;
				out[5] = 1 - (xx + zz);
				out[6] = yz + wx;
				out[7] = 0;
				out[8] = xz + wy;
				out[9] = yz - wx;
				out[10] = 1 - (xx + yy);
				out[11] = 0;
				return out;
			}

			static fromQuaternionTranslationScale(out, q, v, s){
				var x = q[0], y = q[1], z = q[2], w = q[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2,
				sx = s[0],
				sy = s[1],
				sz = s[2];

				out[0] = (1 - (yy + zz)) * sx;
				out[1] = (xy + wz) * sx;
				out[2] = (xz - wy) * sx;
				out[3] = 0;
				out[4] = (xy - wz) * sy;
				out[5] = (1 - (xx + zz)) * sy;
				out[6] = (yz + wx) * sy;
				out[7] = 0;
				out[8] = (xz + wy) * sz;
				out[9] = (yz - wx) * sz;
				out[10] = (1 - (xx + yy)) * sz;
				out[11] = 0;
				out[12] = v[0];
				out[13] = v[1];
				out[14] = v[2];
				out[15] = 1;

				return out;
			}
			static invert(out,mat) {
				if(mat === undefined) mat = out; //If input isn't sent, then output is also input

				var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
					a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
					a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
					a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

					b00 = a00 * a11 - a01 * a10,
					b01 = a00 * a12 - a02 * a10,
					b02 = a00 * a13 - a03 * a10,
					b03 = a01 * a12 - a02 * a11,
					b04 = a01 * a13 - a03 * a11,
					b05 = a02 * a13 - a03 * a12,
					b06 = a20 * a31 - a21 * a30,
					b07 = a20 * a32 - a22 * a30,
					b08 = a20 * a33 - a23 * a30,
					b09 = a21 * a32 - a22 * a31,
					b10 = a21 * a33 - a23 * a31,
					b11 = a22 * a33 - a23 * a32,

					// Calculate the determinant
					det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

				if (!det) return false;
				det = 1.0 / det;

				out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
				out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
				out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
				out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
				out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
				out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
				out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
				out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
				out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
				out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
				out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
				out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
				out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
				out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
				out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
				out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

				return true;
			}
			static translate(out,x,y,z){
				out[12] = out[0] * x + out[4] * y + out[8]	* z + out[12];
				out[13] = out[1] * x + out[5] * y + out[9]	* z + out[13];
				out[14] = out[2] * x + out[6] * y + out[10]	* z + out[14];
				out[15] = out[3] * x + out[7] * y + out[11]	* z + out[15];
			}
	}

	function NewShader(name,vert,frag){
		var shader = new ShaderBuilder(vert,frag);
		Fungi.Res.Shaders[name] = shader;
		return shader;
	}

	class Material{
		static create(name,shaderName){
			var m = new Material();
			m.shader = Fungi.Res.Shaders[shaderName];

			Fungi.Res.Materials[name] = m;
			return m;
		}

		constructor(){
			this.shader = null;

			this.useCulling = true;
			this.useBlending = false;
			this.useDepthTest = true;
			this.useModelMatrix = true;

			this.drawMode = gl.TRIANGLES;
		}
	}

	class ShaderBuilder{
		constructor(vertShader,fragShader){
			if(vertShader.length < 20)	this.program = ShaderUtil.domShaderProgram(vertShader,fragShader,true);
			else						this.program = ShaderUtil.createProgramFromText(vertShader,fragShader,true);
			
			if(this.program != null){
				gl.useProgram(this.program);
				this._UniformList = [];
			}
		}

		prepareUniforms(uName,uType){
			if(arguments.length % 2 != 0 ){ console.log("prepareUniforms needs arguments to be in pairs."); return this; }
			
			var loc = 0;
			for(var i=0; i < arguments.length; i+=2){
				loc = gl.getUniformLocation(this.program,arguments[i]);
				if(loc != null) this._UniformList[arguments[i]] = {loc:loc,type:arguments[i+1]};
				else console.log("Uniform not found " + arguments[i]);
			}
			return this;
		}

		prepareUniformBlocks(ubo,blockIndex){
			for(var i=0; i < arguments.length; i+=2){
				gl.uniformBlockBinding(this.program, arguments[i+1], arguments[i].blockPoint);
			}
			return this;
		}
		setUniforms(uName,uValue){
			if(arguments.length % 2 != 0){ console.log("setUniforms needs arguments to be in pairs."); return this; }

			var texCnt = 0,
				name;

			for(var i=0; i < arguments.length; i+=2){
				name = arguments[i];
				if(this._UniformList[name] === undefined){ console.log("uniform not found " + name); return this; }

				switch(this._UniformList[name].type){
					case "vec2":	gl.uniform2fv(this._UniformList[name].loc, arguments[i+1]); break;
					case "vec3":	gl.uniform3fv(this._UniformList[name].loc, arguments[i+1]); break;
					case "vec4":	gl.uniform4fv(this._UniformList[name].loc, arguments[i+1]); break;
					case "mat4":	gl.uniformMatrix4fv(this._UniformList[name].loc,false,arguments[i+1]); break;
					case "tex":
						gl.activeTexture(gl["TEXTURE" + texCnt]);
						gl.bindTexture(gl.TEXTURE_2D,uValue);
						gl.uniform1i(this._UniformList[name].loc,texCnt);
						texCnt++;
						break;
					default: console.log("unknown uniform type for " + name); break;
				}
			}
			return this;
		}

		activate(){ gl.useProgram(this.program); return this; }
	}

	class ShaderUtil{
		static domShaderSrc(elmID){
			var elm = document.getElementById(elmID);
			if(!elm || elm.text == ""){ console.log(elmID + " shader not found or no text."); return null; }

			return elm.text;
		}
		static createShader(src,type){
			var shader = gl.createShader(type);
			gl.shaderSource(shader,src);
			gl.compileShader(shader);
			if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
				console.error("Error compiling shader : " + src, gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}

			return shader;
		}
		static createProgram(vShader,fShader,doValidate){
			var prog = gl.createProgram();
			gl.attachShader(prog,vShader);
			gl.attachShader(prog,fShader);
			gl.linkProgram(prog);
			if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
				console.error("Error creating shader program.",gl.getProgramInfoLog(prog));
				gl.deleteProgram(prog); return null;
			}
			if(doValidate){
				gl.validateProgram(prog);
				if(!gl.getProgramParameter(prog,gl.VALIDATE_STATUS)){
					console.error("Error validating program", gl.getProgramInfoLog(prog));
					gl.deleteProgram(prog); return null;
				}
			}
			gl.detachShader(prog,vShader);
			gl.detachShader(prog,fShader);
			gl.deleteShader(fShader);
			gl.deleteShader(vShader);

			return prog;
		}

		static domShaderProgram(vectID,fragID){
			var vShaderTxt	= ShaderUtil.domShaderSrc(vectID);							if(!vShaderTxt)	return null;
			var fShaderTxt	= ShaderUtil.domShaderSrc(fragID);							if(!fShaderTxt)	return null;
			var vShader		= ShaderUtil.createShader(vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
			var fShader		= ShaderUtil.createShader(fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }
			return ShaderUtil.createProgram(vShader,fShader,true);
		}

		static createProgramFromText(vShaderTxt,fShaderTxt){
			var vShader		= ShaderUtil.createShader(vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
			var fShader		= ShaderUtil.createShader(fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }
			return ShaderUtil.createProgram(vShader,fShader,true);
		}
	}

	class UBO{
		constructor(blockName,blockPoint,bufSize,aryCalc){
			this.items = [];
			this.keys = [];
			
			for(var i=0; i < aryCalc.length; i++){
				this.items[aryCalc[i].name]	= {offset: aryCalc[i].offset,dataLen: aryCalc[i].dataLen,chunkLen:aryCalc[i].chunkLen};
				this.keys[i]				= aryCalc[i].name;
			}
			this.blockPoint = blockPoint;
			this.buf = gl.createBuffer();
			gl.bindBuffer(gl.UNIFORM_BUFFER,this.buf);
			gl.bufferData(gl.UNIFORM_BUFFER,gl.UNIFORM_BUFFER,gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.UNIFORM_BUFFER,null);
			gl.bindBufferBase(gl.UNIFORM_BUFFER, blockPoint, this.buf);
		}

		update(name,data){
			gl.bindBuffer(gl.UNIFORM_BUFFER,this.buf);
			for(var i=0; i < arguments.length; i+=2){
				gl.bufferSubData(gl.UNIFORM_BUFFER, this.items[ arguments[i] ].offset, arguments[i+1], 0, null);
			}
			gl.bindBuffer(gl.UNIFORM_BUFFER,null);
			return this;
		}

		static createTransformUBO(){
			return UBO.create(Fungi.UBO_TRANSFORM,0,[ {name:"matProjection",type:"mat4"}, {name:"matCameraView",type:"mat4"}, {name:"posCamera",type:"vec3"} ]);
		}

		static create(blockName,blockPoint,ary){
			var bufSize = UBO.calculate(ary);
			Fungi.Res.Ubo[blockName] = new UBO(blockName,blockPoint,bufSize,ary);
			return Fungi.Res.Ubo[blockName];
		}

		static getSize(type){
			switch(type){
				case "f": case "i": case "b": return [4,4];
				case "mat4": return [64,64];
				case "mat3": return [48,48];
				case "vec2": return [8,8];
				case "vec3": return [16,12];
				case "vec4": return [16,16];
				default: return [0,0];
			}
		}

		static calculate(ary){
			var chunk = 16,
				tsize = 0,
				offset = 0,
				size;

			for(var i=0; i < ary.length; i++){
				if(!ary[i].arylen || ary[i].arylen == 0) size = UBO.getSize(ary[i].type);
				else size = [ary[i].arylen * 16,ary[i].arylen * 16];
				tsize = chunk-size[0];
				if(tsize < 0 && chunk < 16){
					offset += chunk;
					if(i > 0) ary[i-1].chunkLen += chunk;
					chunk = 16;
				}else if(tsize < 0 && chunk == 16){
				}else if(tsize == 0){
					if(ary[i].type == "vec3" && chunk == 16) chunk -= size[1];
					else chunk = 16;
				}else chunk -= size[1];
				ary[i].offset	= offset;
				ary[i].chunkLen	= size[1];
				ary[i].dataLen	= size[1];
				offset += size[1];
			}
			return offset;
		}
	}
	class VAO{
		static create(out){
			out.buffers = [];
			out.id = gl.createVertexArray();
			out.isIndexed = false;
			out.count = 0;

			gl.bindVertexArray(out.id);
			return VAO;
		}

		static finalize(out,name){
			gl.bindVertexArray(null);
			gl.bindBuffer(gl.ARRAY_BUFFER,null);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
			Fungi.Res.Vao[name] = out;
		}
		static floatArrayBuffer(out,name,aryFloat,attrLoc,size,stride,offset,isStatic,keepData){
			var rtn = {
				buf:gl.createBuffer(),
				size:size,
				stride:stride,
				offset:offset,
				count:aryFloat.length / size
			};
			if(keepData == true) rtn.data = aryFloat;
			var ary = (aryFloat instanceof Float32Array)? aryFloat : new Float32Array(aryFloat);

			gl.bindBuffer(gl.ARRAY_BUFFER, rtn.buf);
			gl.bufferData(gl.ARRAY_BUFFER, ary, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );
			gl.enableVertexAttribArray(attrLoc);
			gl.vertexAttribPointer(attrLoc,size,gl.FLOAT,false,stride || 0,offset || 0);

			out.buffers[name] = rtn;
			return VAO;
		}
		static indexBuffer(out,name,aryUInt,isStatic,keepData){
			var rtn = { buf:gl.createBuffer(), count:aryUInt.length };
			if(keepData == true) rtn.data = aryUInt;

			var ary = (aryUInt instanceof Uint16Array)? aryUInt : new Uint16Array(aryUInt);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rtn.buf );  
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ary, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );

			out.buffers[name] = rtn;
			out.isIndexed = true;
			out.count = aryUInt.length;

			return VAO;
		}

		static standardMesh(name,vertSize,aryVert,aryNorm,aryUV,aryInd,keepData){
			var rtn = {};
			VAO.create(rtn).floatArrayBuffer(rtn,"vert",aryVert,Fungi.ATTR_POSITION_LOC,vertSize,0,0,true,keepData);
			rtn.count = rtn.buffers["vert"].count;

			if(aryNorm)	VAO.floatArrayBuffer(rtn,"norm",aryNorm,Fungi.ATTR_NORM_LOC,3,0,0,true,keepData);
			if(aryUV)	VAO.floatArrayBuffer(rtn,"uv",aryUV,Fungi.ATTR_UV_LOC,2,0,0,true,keepData);
			if(aryInd)	VAO.indexBuffer(rtn,"index",aryInd,true,keepData);

			if(rtn.count == 0) rtn.count = aryVert.length / vertSize;

			VAO.finalize(rtn);
			return rtn;
		}
	}
	class RenderLoop{
		constructor(callback,fps){
			this.isActive		= false;
			this._lastFrame	= null;
			this._callBack		= callback;
			this._frameCaller	= window;
			this._fpsLimit		= 0;
			this._runPtr 		= null;
			this._fpsLast		= null;
			this._fpsCnt		= 0;
			this.setFPSLimit( (fps != undefined && fps > 0)?fps:0  );
		}

		start(){
			this.isActive = true;
			this._frameCaller.requestAnimationFrame(this._runPtr);
			return this;
		}

		setFPSLimit(v){
			if(v <= 0){
				this._fpsLimit = 0;
				this._runPtr = this.runFull.bind(this);
			}else{
				this._fpsLimit = 1000/v;
				this._runPtr = this.runLimit.bind(this);
			}
		}

		runLimit(){
			var msCurrent	= performance.now(),
				msDelta		= (msCurrent - this._lastFrame),
				deltaTime	= msDelta / 1000.0;
			if(msDelta >= this._fpsLimit){ //Now execute frame since the time has elapsed.
				this.fps		= Math.floor(1/deltaTime);
				this._lastFrame	= msCurrent;
				this._callBack(deltaTime);
			}

			if(this.isActive) this._frameCaller.requestAnimationFrame(this._runPtr);
		}

		runFull(){
			var msCurrent	= performance.now(), deltaTime	= (msCurrent - this._lastFrame) / 1000.0;
			this._fpsCnt++;
			if(msCurrent - this._fpsLast >= 1000){
				this.fps		= this._fpsCnt;
				this._fpsCnt	= 0;
				this._fpsLast	= msCurrent;
			}
			this._lastFrame		= msCurrent;
			this._callBack(deltaTime);
			if(this.isActive)	this._frameCaller.requestAnimationFrame(this._runPtr);
		}
	}

  var Renderer = (function(){
		var f = function(ary){
			if(f.onPreRender != null) f.onPreRender(f);
			for(var i=0; i < ary.length; i++){
				if(ary[i].visible == false) continue;
				f.prepareNext(ary[i]).draw();
				if(f.onItemRendered != null) f.onItemRendered(ary[i]);
			}
			if(f.onPostRender != null) f.onPostRender(f);
			gl.bindVertexArray(null);
		};
		f.onItemRendered	= null;
		f.onPreRender		= null;
		f.onPostRender		= null;
		f.material			= null;
		f.shader			= null;
		f.prepareNext = function(itm){
			if(f.material !== itm.material){
				f.material = itm.material;
				if(f.material.shader !== f.shader) f.shader = f.material.shader.activate();
				if(f.material.useCulling != CULLING_STATE)	gl[ ( (CULLING_STATE = (!CULLING_STATE))  )?"enable":"disable" ](gl.CULL_FACE);
				if(f.material.useBlending != BLENDING_STATE)	gl[ ( (BLENDING_STATE = (!BLENDING_STATE)) )?"enable":"disable" ](gl.BLEND);
				if(f.material.useDepthTest != DEPTHTEST_STATE)	gl[ ( (DEPTHTEST_STATE = (!DEPTHTEST_STATE)) )?"enable":"disable" ](gl.DEPTH_TEST);
			}
			if(f.material.useModelMatrix) f.material.shader.setUniforms(Fungi.UNI_MODEL_MAT_NAME,itm.updateMatrix());
			return itm;
		}
		return f;
	})();
	return{
		Init:Init, gl:null,
		Res:{ Textures:[], Videos:[], Images:[], Shaders:[], Ubo:[], Vao:[], Fbo:[], Materials:[] },
		Shaders:{Material:Material, New:NewShader, Util:ShaderUtil, VAO:VAO, UBO:UBO},
		Renderable:Renderable, CameraOrbit:CameraOrbit,
		RenderLoop:RenderLoop,
		Render:Renderer,
		ATTR_POSITION_LOC:0,
		ATTR_NORM_LOC:1,
		ATTR_UV_LOC:2,
		UBO_TRANSFORM:"UBOTransform",
		UNI_MODEL_MAT_NAME:"uModalMatrix",
	};
})();