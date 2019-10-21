let imax = 100;
let squareRadius = 3e5;
let state = { x: new Double(-0.75), y: new Double(0), hx: new Double(1.25), hy: new Double(1.15)};

const Events = {
  lastPos : {},

  Zoom(pos, factor) {
    state.x = pos.x;
    state.y = pos.y;
    lastPos = pos;
    state.hx = state.hx.mul(factor);
    state.hy = state.hy.mul(factor);
    drawAll(state);
    Events.updateState();
  },

  updateState() {
    const glcontrol = document.getElementById('glcontrol');
    const ctx = glcontrol.getContext('2d');
    ctx.clearRect(0, 0, glcontrol.width, glcontrol.height);
    glcontrol.width = ctx.canvas.clientWidth;
    glcontrol.height = ctx.canvas.clientHeight;
    const gl = twgl.getContext(document.getElementById('gljulia'));
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
};

let getCachedProgram = (() => {
  let savedGl = null, savedVert = null, savedFrag = null, savedProgramInfo = null;
  return (gl, vert, frag) => {
    if (gl != savedGl || vert != savedVert || savedFrag != frag()) {
      savedGl = gl; savedVert = vert; savedFrag = frag();
      savedProgramInfo = twgl.createProgramInfo(savedGl, [vert, savedFrag]);
    }
    return savedProgramInfo;
  }
})();

let glMandel = twgl.getWebGLContext(document.getElementById('glmandel'), { antialias: false, depth: false });
twgl.addExtensionsToContext(glMandel);

function calcArea(c, returnIteration) {
  console.log(c);
  let x = c.x, y = c.y;
  let xx = x.sqr(), yy = y.sqr(), xy = x.mul(y);
  let dx = Double.One, dy = Double.Zero, temp;
  let i, area = [x.toNumber(), y.toNumber(), dx.toNumber(), dy.toNumber()]
  for (i = 1; i < imax && xx.add(yy).lt(squareRadius); i++) {
    temp = x.mul(dx).sub(y.mul(dy)).mul(2).add(1);
    dy = x.mul(dy).add(y.mul(dx)).mul(2);
    dx = temp;
    x = xx.sub(yy).add(c.x);
    y = xy.add(xy).add(c.y);
    xx = x.sqr(); yy = y.sqr(); xy = x.mul(y);
    area.push(x.toNumber());
    area.push(y.toNumber());
    area.push(dx.toNumber());
    area.push(dy.toNumber());
  }
  return returnIteration ? i : area;
}

function searchArea(state) {
  let repeat = 15, n = 12, m = 3;
  let z = {}, zbest = {}, newState = Object.assign({}, state), f, fbest = -Infinity;
  for (let k = 0; k < repeat; k++) {
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        z.x = newState.x.add(newState.hx.mul(2 * i / n - 1));
        z.y = newState.y.add(newState.hy.mul(2 * j / n - 1));
        f = calcArea(z, true);
        if (f == imax) {
          return z;
        } else if (f > fbest) {
          Object.assign(zbest, z);
          fbest = f;
        }
      }
    }
    Object.assign(newState, zbest);
    newState.hx = newState.hx.div(m / n);
    newState.hy = newState.hy.div(m / n);
  }
  return zbest;
}

function drawAll(state) {
  try {
    let gl = glMandel;
    twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const ratio = gl.canvas.width / gl.canvas.height;
    if (ratio > 1) {
      state.hx = state.hy.mul(ratio);
    } else {
      state.hy = state.hx.div(ratio);
    }
    const programInfo = getCachedProgram(gl, vert, frag);
    gl.useProgram(programInfo.program);

    const origin = searchArea(state);
    const area = calcArea(origin);
    //2D текстура, не уверена, что она тут нужна, но в задании было
    const orbittex = twgl.createTexture(gl, {
      format: gl.RGBA,
      type: gl.FLOAT,
      minMag: gl.NEAREST,
      wrap: gl.CLAMP_TO_EDGE,
      src: area,
    });

    const attribs = { a_position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 } };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    const uniforms = {
      center: [state.x.sub(origin.x).toNumber(), state.y.sub(origin.y).toNumber()],
      size: [state.hx.toNumber(), state.hy.toNumber()],
      pixelsize: [state.hx.toNumber() / gl.canvas.width, state.hy.toNumber() / gl.canvas.height],
      orbittex: orbittex,
    };
    twgl.setUniforms(programInfo, uniforms);

    twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_FAN);
  } catch (error) {
    console.log(error);
  }
}

function getPosOnScreen(e) {
  const dx = state.hx.mul(2 * e.offsetX / glcontrol.width - 1);
  const dy = state.hy.mul(2 * e.offsetY / glcontrol.height - 1);
  return {
    x: state.x.add(dx),
    y: state.y.add(dy.mul(-1)),
    px: e.offsetX,
    py: e.offsetY,
  };
}

function wheelZoom(pos) {
  const factor = Math.pow(2, -wheelAccum / 200);
  pos.x = pos.x.add(state.x.sub(pos.x).mul(factor));
  pos.y = pos.y.add(state.y.sub(pos.y).mul(factor));
  Events.Zoom(pos, factor);
  wheelAccum = 0;
}

function moveMouse(pos) {
  Events.Zoom(pos, 1);
}

const glcontrol = document.getElementById('glcontrol');
let mouseDownPos, prevPhi, prevX, prevY;
let wheelAccum = 0;

document.addEventListener('DOMContentLoaded', () => {
  Events.updateState();
  drawAll(state);
});

glcontrol.addEventListener('wheel', e => {
  e.preventDefault();
  if (wheelAccum == 0) {
    setTimeout(() => wheelZoom(getPosOnScreen(e)));
  }
  wheelAccum += e.deltaY;
});

glcontrol.addEventListener('mouseup', e => {
  e.preventDefault();
  setTimeout(() => moveMouse(getPosOnScreen(e)));
});

glcontrol.addEventListener('mousedown', e => {
  e.preventDefault();
  mouseDownPos = getPosOnScreen(e);
});

