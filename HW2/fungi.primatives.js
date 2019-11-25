Fungi.Primatives = {
	FacedCube:function(){
		var width = 1, height = 1, depth = 1, x = 0, y = 0, z = 0;
		var w = width*0.5, h = height*0.5, d = depth*0.5;
		var x0 = x-w, x1 = x+w, y0 = y-h, y1 = y+h, z0 = z-d, z1 = z+d;
		var aVert = [
			x0, y1, z1, 0,
			x0, y0, z1, 0,
			x1, y0, z1, 0,
			x1, y1, z1, 0,
			x1, y1, z0, 1,
			x1, y0, z0, 1,
			x0, y0, z0, 1,
			x0, y1, z0, 1,
			x0, y1, z0, 2,
			x0, y0, z0, 2,
			x0, y0, z1, 2,
			x0, y1, z1, 2,
			x0, y0, z1, 3,
			x0, y0, z0, 3,
			x1, y0, z0, 3,
			x1, y0, z1, 3,
			x1, y1, z1, 4,
			x1, y0, z1, 4,
			x1, y0, z0, 4,
			x1, y1, z0, 4,
			x0, y1, z0, 5,
			x0, y1, z1, 5,
			x1, y1, z1, 5,
			x1, y1, z0, 5
		];
		var aIndex = [];
		for(var i=0; i < aVert.length / 4; i+=2) aIndex.push(i, i+1, (Math.floor(i/4)*4)+((i+2)%4));
		var aUV = [];
		for(var i=0; i < 6; i++) aUV.push(0,0,	0,1,  1,1,  1,0);
		var aNorm = [
			 0, 0, 1,	 0, 0, 1,	 0, 0, 1,	 0, 0, 1,
			 0, 0,-1,	 0, 0,-1,	 0, 0,-1,	 0, 0,-1,
			-1, 0, 0,	-1, 0, 0,	-1, 0, 0,	-1, 0, 0,
			 0,-1, 0,	 0,-1, 0,	 0,-1, 0,	 0,-1, 0,
			 1, 0, 0,	 1, 0, 0,	 1, 0, 0,	 1, 0, 0,
			 0, 1, 0,	 0, 1, 0,	 0, 1, 0,	 0, 1, 0
		];

		console.log([
			x0, y1, z1,
			x0, y0, z1,
			x1, y0, z1,
			x1, y1, z1,
		]);
		return Fungi.Shaders.VAO.standardMesh("FungiFCube",4,aVert,aNorm,aUV,aIndex,false);
	}
}; 