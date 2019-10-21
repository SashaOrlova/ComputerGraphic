let helpers = `
vec4 unpackOrbit(int i) {
      float fi = float(i);
      vec2 texcoord = vec2(mod(fi, 10.0), floor(fi / 10.0)) / 10.0;
      return texture2D(orbittex, texcoord);
    }

    float interpolate(float s, float s1, float s2, float s3, float d) {
      float d2 = d * d, d3 = d * d2;
      return 0.5 * (s * (d3 - d2) + s1 * (d + 4.*d2 - 3.*d3) + s2 * (2. - 5.*d2 + 3.*d3) + s3 * (-d + 2.*d2 - d3));
    }

    struct result {
      float time;
      float zz;
      float dzdz;
      float stripe;
      float argZ;
    };

    result calculator(vec2 AA) {
      float u = delta.x + AA.x, v = delta.y + AA.y;
      float zz, time, temp, du = 0., dv = 0.;
      float stripe, s1, s2, s3;
      vec2 z, dz, O, dO;

      for (int i = 0; i < imax; i++) {
        vec4 values = unpackOrbit(i);
        O = values.xy;
        dO = values.zw;
        z = O + vec2(u, v);
        dz = dO + vec2(du, dv);
        zz = dot(z, z);

        temp = 2. * (dO.x * u - dO.y * v + z.x * du - z.y * dv);
        dv =   2. * (dO.x * v + dO.y * u + z.x * dv + z.y * du);
        du = temp;

        temp = u * u - v * v + 2. * (u * O.x - v * O.y); 
        v =    u * v + u * v + 2. * (v * O.x + u * O.y);
        u = temp;
        u += delta.x;
        v += delta.y;
        
        stripe += z.x * z.y / zz * step(0.0, time);
        s3 = s2; s2 = s1; s1 = stripe;

        time += 1.;
        if (zz > square_radius) { break; }
      }

      time += clamp(1.0 + logLogRR - log2(log2(zz)), 0., 1.);
       stripe = interpolate(stripe, s1, s2, s3, fract(time));
      return result(time, zz, dot(dz,dz), stripe, atan(z.y, z.x));
    }
`;

let vert = `
  precision highp float;

  attribute vec2 a_position;
  uniform vec2 center;
  uniform vec2 size;
  varying vec2 delta;

  void main() {
    vec2 z = size * a_position;
    delta = center + vec2(z.x, z.y);

    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

let frag = () => `
    precision highp float;

    #define imax ${imax}
    #define square_radius ${squareRadius}.
    
    const float logLogRR = log2(log2(square_radius));
    
    varying vec2 delta;
    varying vec2 texcoord;

    uniform vec2 size;
    uniform vec2 pixelsize;
    uniform sampler2D orbittex;

    ${helpers}

    void main() {
      //¬ычислени€, используем переданную текстурку
      result R = calculator(vec2(0));

      float dem = sqrt(R.zz / R.dzdz) * log2(R.zz);

      vec3 color;
      color += 0.7 + 2.5 * (R.stripe / clamp(R.time, 0., 200.)) * (1. - 0.6 * step(float(imax), 1. + R.time));
      color = 0.5 + 0.5 * sin(color + vec3(4.0, 4.6, 5.2) + 50.0 * R.time / float(imax));
  
      gl_FragColor = vec4(color, 1.);
    }`;