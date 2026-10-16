const TAU = Math.PI * 2;
const EPSILON = 1e-6;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown shader linking error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function createSphereGeometry(latitudeBands = 64, longitudeBands = 96) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let latitude = 0; latitude <= latitudeBands; latitude += 1) {
    const theta = latitude * Math.PI / latitudeBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let longitude = 0; longitude <= longitudeBands; longitude += 1) {
      const phi = longitude * TAU / longitudeBands;
      const x = Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      positions.push(x, y, z);
      normals.push(x, y, z);
      uvs.push(1 - longitude / longitudeBands, 1 - latitude / latitudeBands);
    }
  }

  for (let latitude = 0; latitude < latitudeBands; latitude += 1) {
    for (let longitude = 0; longitude < longitudeBands; longitude += 1) {
      const first = latitude * (longitudeBands + 1) + longitude;
      const second = first + longitudeBands + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices)
  };
}

function createRingGeometry(segments = 256, inner = 1.24, outer = 2.14) {
  const positions = [];
  const uvs = [];
  const indices = [];

  // The ring lies in the planet's equatorial XZ plane. It receives exactly
  // the same orientation matrix as the planet, so both objects move together.
  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = segment * TAU / segments;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    positions.push(cosine * inner, 0, sine * inner, cosine * outer, 0, sine * outer);
    uvs.push(0, segment / segments, 1, segment / segments);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const base = segment * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices)
  };
}

function createBuffer(gl, target, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return buffer;
}

function bindAttribute(gl, program, name, buffer, size) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function quatIdentity() {
  return [0, 0, 0, 1];
}

function quatNormalize(quaternion) {
  const length = Math.hypot(...quaternion) || 1;
  return quaternion.map((value) => value / length);
}

function quatMultiply(left, right) {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return quatNormalize([
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz
  ]);
}

function quatFromAxisAngle(axis, angle) {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length < EPSILON || Math.abs(angle) < EPSILON) return quatIdentity();
  const half = angle * 0.5;
  const sine = Math.sin(half) / length;
  return quatNormalize([axis[0] * sine, axis[1] * sine, axis[2] * sine, Math.cos(half)]);
}

function quatFromEuler(pitch = 0, yaw = 0, roll = 0) {
  const pitchQ = quatFromAxisAngle([1, 0, 0], pitch);
  const yawQ = quatFromAxisAngle([0, 1, 0], yaw);
  const rollQ = quatFromAxisAngle([0, 0, 1], roll);
  return quatMultiply(rollQ, quatMultiply(yawQ, pitchQ));
}

function matrixFromQuaternion(quaternion) {
  const [x, y, z, w] = quatNormalize(quaternion);
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;

  // Column-major format for WebGL's uniformMatrix3fv.
  return new Float32Array([
    1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy),
    2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx),
    2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)
  ]);
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function normalizeVector(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function mapPointerToTrackball(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(1, Math.min(rect.width, rect.height));
  const x = (clientX - (rect.left + rect.width / 2)) * 2 / scale;
  const y = ((rect.top + rect.height / 2) - clientY) * 2 / scale;
  const radius = 0.92;
  const distanceSquared = x * x + y * y;
  const z = distanceSquared <= radius * radius * 0.5
    ? Math.sqrt(Math.max(0, radius * radius - distanceSquared))
    : (radius * radius) / (2 * Math.sqrt(distanceSquared));
  return normalizeVector([x, y, z]);
}

function quaternionBetween(from, to) {
  const axis = cross(from, to);
  const cosine = clamp(dot(from, to), -1, 1);
  if (Math.hypot(...axis) < EPSILON) return quatIdentity();
  return quatFromAxisAngle(axis, Math.acos(cosine));
}

const vertexShader = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUv;

  uniform float uAspect;
  uniform float uCameraDistance;
  uniform mat3 uModelRotation;

  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vec3 position = uModelRotation * aPosition;
    vec3 normal = uModelRotation * aNormal;

    position.z -= uCameraDistance;
    float fieldOfView = 1.72;
    float nearPlane = 0.1;
    float farPlane = 30.0;
    float depthA = (farPlane + nearPlane) / (nearPlane - farPlane);
    float depthB = (2.0 * farPlane * nearPlane) / (nearPlane - farPlane);

    gl_Position = vec4(
      position.x * fieldOfView / uAspect,
      position.y * fieldOfView,
      depthA * position.z + depthB,
      -position.z
    );

    vNormal = normalize(normal);
    vUv = aUv;
    vViewPosition = position;
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uPlanetStyle;
  uniform float uTime;
  uniform vec3 uAccent;

  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 value) {
    vec2 cell = floor(value);
    vec2 local = fract(value);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
    for (int octave = 0; octave < 6; octave += 1) {
      result += noise(value) * amplitude;
      value = rotation * value * 2.03 + 7.13;
      amplitude *= 0.5;
    }
    return result;
  }

  float ridgedFbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.6;
    mat2 rotation = mat2(0.6, -0.8, 0.8, 0.6);
    for (int octave = 0; octave < 5; octave += 1) {
      float layer = noise(value) * 2.0 - 1.0;
      result += (1.0 - abs(layer)) * amplitude;
      value = rotation * value * 2.25 + 5.7;
      amplitude *= 0.52;
    }
    return result;
  }

  mat2 rotation2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * clamp((value - inMin) / (inMax - inMin), 0.0, 1.0);
  }

  float craterMask(vec2 uv, vec2 center, float radius, float rim) {
    float distanceToCenter = length(uv - center);
    float bowl = 1.0 - smoothstep(radius * 0.55, radius, distanceToCenter);
    float ring = smoothstep(radius, radius + rim, distanceToCenter) - smoothstep(radius + rim, radius + rim * 2.0, distanceToCenter);
    return bowl * 0.68 + ring * 0.64;
  }

  float craterField(vec2 uv, float scale, float seed) {
    vec2 position = uv * scale;
    vec2 cell = floor(position);
    vec2 local = fract(position) - 0.5;
    float field = 0.0;
    for (int y = -1; y <= 1; y += 1) {
      for (int x = -1; x <= 1; x += 1) {
        vec2 offset = vec2(float(x), float(y));
        vec2 id = cell + offset + vec2(seed, seed * 0.37);
        float active = step(0.34, hash(id + 19.1));
        vec2 jitter = vec2(hash(id + 1.3), hash(id + 7.7)) - 0.5;
        vec2 center = offset + jitter * 0.82;
        float radius = mix(0.10, 0.33, hash(id + 3.9));
        float distanceToCenter = length(local - center);
        float bowl = 1.0 - smoothstep(radius * 0.52, radius, distanceToCenter);
        float rim = smoothstep(radius, radius + 0.055, distanceToCenter) - smoothstep(radius + 0.055, radius + 0.11, distanceToCenter);
        field += active * (bowl * 0.56 + rim * 0.66);
      }
    }
    return clamp(field, 0.0, 1.0);
  }

  vec3 mercury(vec2 uv) {
    float macro = fbm(uv * 6.4 + 1.3);
    float ridges = ridgedFbm(uv * 16.0 + vec2(4.6, 2.4));
    float largeCraters = craterField(uv, 5.6, 4.2);
    float microCraters = craterField(uv + vec2(1.3, 2.1), 10.5, 13.7);
    float impactRays = smoothstep(0.62, 0.95, ridgedFbm(uv * 28.0 + vec2(8.4, 1.2)));
    vec3 rock = mix(vec3(0.19, 0.20, 0.23), vec3(0.78, 0.75, 0.71), macro * 0.78 + ridges * 0.22);
    rock *= 0.74 + ridges * 0.34;
    rock = mix(rock, rock * 0.40, largeCraters * 0.62 + microCraters * 0.30);
    rock += vec3(0.10, 0.09, 0.08) * impactRays * 0.14;
    rock = mix(rock, vec3(0.86, 0.81, 0.75), smoothstep(0.72, 0.98, ridges) * 0.08);
    return rock;
  }

  vec3 venus(vec2 uv) {
    float t = uTime * 0.03;
    vec2 centered = (uv - 0.5) * vec2(1.0, 1.55);
    vec2 warp = rotation2d(0.42) * centered;
    float mass = fbm(vec2(warp.x * 5.0 + t * 0.36, warp.y * 8.0 - t * 0.10) + 5.7);
    float streaks = sin(warp.y * 34.0 + mass * 6.5 + sin(warp.x * 8.0 - t) * 0.9) * 0.5 + 0.5;
    float curls = fbm(rotation2d(0.84) * vec2(warp.x * 18.0 - t * 0.12, warp.y * 22.0 + t * 0.08) + 12.7);
    float haze = fbm(vec2(uv.x * 10.0 + t * 0.08, uv.y * 14.0));
    vec3 lower = mix(vec3(0.46, 0.20, 0.07), vec3(0.87, 0.53, 0.16), mass);
    vec3 upper = mix(vec3(0.88, 0.67, 0.26), vec3(0.99, 0.92, 0.68), streaks * 0.68 + curls * 0.32);
    vec3 clouds = mix(lower, upper, smoothstep(0.22, 0.88, streaks * 0.58 + mass * 0.24 + curls * 0.18));
    clouds = mix(clouds, vec3(0.98, 0.90, 0.73), smoothstep(0.62, 0.96, haze) * 0.18);
    return clouds;
  }

  vec3 earth(vec2 uv) {
    vec2 detailUv = vec2(uv.x * 14.0, uv.y * 10.0);
    float coastNoise = (fbm(detailUv + vec2(3.2, 8.1)) - 0.5) * 0.024;

    float northAmerica = length((uv - vec2(0.38, 0.38)) * vec2(1.25, 1.85)) - 0.060 + coastNoise;
    float southAmerica = length((uv - vec2(0.45, 0.58)) * vec2(1.85, 1.10)) - 0.044 + coastNoise;
    float europe = length((uv - vec2(0.57, 0.37)) * vec2(1.75, 2.10)) - 0.035 + coastNoise;
    float africa = length((uv - vec2(0.59, 0.54)) * vec2(1.55, 1.12)) - 0.055 + coastNoise;
    float asia = length((uv - vec2(0.70, 0.39)) * vec2(1.18, 1.95)) - 0.071 + coastNoise;
    float australia = length((uv - vec2(0.79, 0.64)) * vec2(1.42, 2.05)) - 0.037 + coastNoise;
    float greenland = length((uv - vec2(0.48, 0.24)) * vec2(1.55, 2.30)) - 0.024 + coastNoise;

    float land = 0.0;
    land += 1.0 - smoothstep(-0.006, 0.016, northAmerica);
    land += 1.0 - smoothstep(-0.006, 0.016, southAmerica);
    land += 1.0 - smoothstep(-0.006, 0.016, europe);
    land += 1.0 - smoothstep(-0.006, 0.016, africa);
    land += 1.0 - smoothstep(-0.006, 0.016, asia);
    land += 1.0 - smoothstep(-0.006, 0.016, australia);
    land += 1.0 - smoothstep(-0.006, 0.016, greenland);
    land = clamp(land, 0.0, 1.0);

    float deepWater = fbm(vec2(uv.x * 7.0, uv.y * 5.5) + 4.0);
    float terrainNoise = fbm(vec2(uv.x * 18.0, uv.y * 13.0) + 9.0);
    vec3 ocean = mix(vec3(0.006, 0.045, 0.19), vec3(0.018, 0.31, 0.69), deepWater);
    vec3 terrain = mix(vec3(0.045, 0.27, 0.105), vec3(0.61, 0.49, 0.20), terrainNoise);
    float polar = smoothstep(0.82, 0.96, abs(uv.y * 2.0 - 1.0));
    vec3 base = mix(ocean, terrain, land);
    base = mix(base, vec3(0.91, 0.97, 1.0), polar);

    float cloudBase = fbm(vec2(uv.x * 11.0 + uTime * 0.009, uv.y * 8.5));
    float cloudDetail = fbm(vec2(uv.x * 24.0 - uTime * 0.005, uv.y * 15.0));
    float clouds = smoothstep(0.65, 0.80, cloudBase * 0.72 + cloudDetail * 0.28);
    return mix(base, vec3(0.94, 0.98, 1.0), clouds * 0.48);
  }

  vec3 mars(vec2 uv) {
    float terrain = fbm(uv * 6.0 + 1.8);
    float ridges = ridgedFbm(uv * 15.0 + vec2(3.4, 9.5));
    float basalt = smoothstep(0.54, 0.82, fbm(vec2(uv.x * 8.0 - 1.7, uv.y * 5.0 + 4.9)));
    float craterBasin = craterField(uv + vec2(2.7, 4.3), 6.4, 6.2);
    float canyonLine = abs((uv.y - 0.53) + sin(uv.x * 9.6 + fbm(uv * 4.0) * 2.5) * 0.055);
    float canyon = 1.0 - smoothstep(0.014, 0.052, canyonLine);
    vec3 soil = mix(vec3(0.29, 0.08, 0.05), vec3(0.90, 0.39, 0.18), terrain * 0.82 + ridges * 0.18);
    soil *= 0.80 + ridges * 0.26;
    soil = mix(soil, vec3(0.31, 0.17, 0.12), basalt * 0.42 + canyon * 0.26 + craterBasin * 0.16);
    float northCap = smoothstep(0.82, 0.96, 1.0 - uv.y);
    float southCap = smoothstep(0.84, 0.98, uv.y);
    float caps = clamp(northCap + southCap, 0.0, 1.0);
    soil = mix(soil, vec3(0.93, 0.90, 0.84), caps);
    float dust = smoothstep(0.66, 0.92, fbm(vec2(uv.x * 13.0 - uTime * 0.014, uv.y * 11.0 + 8.2)));
    soil = mix(soil, vec3(0.97, 0.74, 0.53), dust * 0.11);
    return soil;
  }

  vec3 jupiter(vec2 uv) {
    float t = uTime * 0.075;
    vec2 flow = vec2(uv.x * 3.8 + t * 0.32, uv.y * 18.0);
    float warp = fbm(flow + vec2(0.0, t * 0.08));
    float bands = uv.y * 26.0 + warp * 2.6 + sin(uv.x * 12.0 + t) * 0.26;
    float broad = sin(bands * 2.35) * 0.5 + 0.5;
    float medium = sin(bands * 4.65 + fbm(flow * 1.4) * 1.8) * 0.5 + 0.5;
    float fine = sin(bands * 8.80 + fbm(flow * 2.3 + 3.1) * 1.4) * 0.5 + 0.5;
    vec3 cream = vec3(0.97, 0.89, 0.76);
    vec3 amber = vec3(0.84, 0.63, 0.42);
    vec3 rust = vec3(0.59, 0.36, 0.21);
    vec3 umber = vec3(0.38, 0.23, 0.14);
    vec3 body = mix(cream, amber, broad * 0.56 + medium * 0.14);
    body = mix(body, rust, smoothstep(0.52, 0.86, fine + warp * 0.12) * 0.42);
    body = mix(body, umber, smoothstep(0.62, 0.95, medium) * 0.18);
    vec2 grsUv = vec2((uv.x - 0.69) * 3.7, (uv.y - 0.58) * 10.4);
    grsUv.x += sin(uv.y * 34.0 + t * 0.9) * 0.10;
    float grs = 1.0 - smoothstep(0.44, 0.74, length(grsUv));
    float grsSwirl = fbm(grsUv * vec2(3.6, 1.8) + t * 0.2);
    vec3 redSpot = mix(vec3(0.57, 0.18, 0.11), vec3(0.86, 0.42, 0.27), grsSwirl);
    body = mix(body, redSpot, grs * 0.92);
    float whiteOvals = smoothstep(0.76, 0.93, fbm(vec2(uv.x * 24.0 - t * 0.28, uv.y * 9.0 + 1.2)));
    body = mix(body, vec3(0.98, 0.95, 0.89), whiteOvals * 0.10);
    return body;
  }

  vec3 saturn(vec2 uv) {
    float t = uTime * 0.04;
    vec2 flow = vec2(uv.x * 4.0 + t * 0.14, uv.y * 16.0);
    float warp = fbm(flow) * 1.8;
    float bands = uv.y * 21.0 + warp;
    float broad = sin(bands * 2.8) * 0.5 + 0.5;
    float fine = sin(bands * 6.2 + fbm(flow * 1.6 + 2.7) * 2.0) * 0.5 + 0.5;
    vec3 ivory = vec3(0.98, 0.93, 0.82);
    vec3 sand = vec3(0.89, 0.77, 0.58);
    vec3 caramel = vec3(0.71, 0.56, 0.36);
    vec3 cocoa = vec3(0.45, 0.33, 0.21);
    vec3 gas = mix(ivory, sand, broad * 0.62 + fine * 0.12);
    gas = mix(gas, caramel, smoothstep(0.48, 0.82, fine) * 0.20);
    gas = mix(gas, cocoa, smoothstep(0.74, 0.95, broad) * 0.12);
    float polarWhorl = smoothstep(0.04, 0.16, abs(uv.y - 0.08)) * smoothstep(0.04, 0.16, abs(uv.y - 0.92));
    gas += vec3(0.06, 0.04, 0.02) * polarWhorl;
    return gas;
  }

  vec3 uranus(vec2 uv) {
    float t = uTime * 0.02;
    float bandField = sin(uv.y * 28.0 + fbm(vec2(uv.x * 5.0 + t, uv.y * 7.0)) * 2.2) * 0.5 + 0.5;
    float methane = fbm(vec2(uv.x * 7.0 + 1.4, uv.y * 11.0 - t * 0.7));
    float polarBrightening = smoothstep(0.66, 0.96, 1.0 - abs(uv.y * 2.0 - 1.0));
    vec3 deep = vec3(0.12, 0.47, 0.56);
    vec3 aqua = vec3(0.63, 0.92, 0.90);
    vec3 pale = vec3(0.88, 0.99, 0.97);
    vec3 body = mix(deep, aqua, bandField * 0.22 + methane * 0.60);
    body = mix(body, pale, smoothstep(0.72, 0.98, methane) * 0.12 + polarBrightening * 0.08);
    return body;
  }

  vec3 neptune(vec2 uv) {
    float t = uTime * 0.11;
    vec2 flow = vec2(uv.x * 5.2 - t * 0.22, uv.y * 14.0 + t * 0.03);
    float belts = sin(uv.y * 38.0 + fbm(flow) * 4.8) * 0.5 + 0.5;
    float turbulence = fbm(vec2(uv.x * 14.0 + t * 0.46, uv.y * 12.0 + 5.4));
    vec3 abyss = vec3(0.02, 0.05, 0.18);
    vec3 cobalt = vec3(0.10, 0.34, 0.82);
    vec3 azure = vec3(0.55, 0.77, 1.0);
    vec3 storm = mix(abyss, cobalt, belts * 0.60 + turbulence * 0.26);
    storm = mix(storm, azure, smoothstep(0.74, 0.96, turbulence) * 0.18);
    vec2 darkSpotUv = vec2((uv.x - 0.36) * 3.0, (uv.y - 0.55) * 7.4);
    float darkSpot = 1.0 - smoothstep(0.34, 0.60, length(darkSpotUv));
    vec2 brightCloudUv = vec2((uv.x - 0.49) * 8.0, (uv.y - 0.44) * 16.0);
    float brightCloud = 1.0 - smoothstep(0.15, 0.34, length(brightCloudUv));
    storm = mix(storm, vec3(0.01, 0.02, 0.09), darkSpot * 0.72);
    storm = mix(storm, vec3(0.85, 0.95, 1.0), brightCloud * 0.30);
    return storm;
  }

  float specularStrength(float style) {
    if (style < 0.5) return 0.04;
    if (style < 1.5) return 0.07;
    if (style < 2.5) return 0.18;
    if (style < 3.5) return 0.06;
    if (style < 4.5) return 0.05;
    if (style < 5.5) return 0.05;
    if (style < 6.5) return 0.06;
    return 0.07;
  }

  float hazeStrength(float style) {
    if (style < 0.5) return 0.018;
    if (style < 1.5) return 0.094;
    if (style < 2.5) return 0.05;
    if (style < 3.5) return 0.03;
    if (style < 4.5) return 0.04;
    if (style < 5.5) return 0.034;
    if (style < 6.5) return 0.052;
    return 0.056;
  }

  vec3 atmosphereTint(float style) {
    if (style < 0.5) return vec3(0.56, 0.58, 0.63);
    if (style < 1.5) return vec3(0.98, 0.82, 0.48);
    if (style < 2.5) return vec3(0.45, 0.62, 1.0);
    if (style < 3.5) return vec3(0.92, 0.58, 0.36);
    if (style < 4.5) return vec3(0.94, 0.83, 0.71);
    if (style < 5.5) return vec3(0.96, 0.84, 0.62);
    if (style < 6.5) return vec3(0.62, 0.92, 0.96);
    return vec3(0.42, 0.62, 1.0);
  }

  float detailShadow(float style, vec2 uv) {
    if (style < 0.5) {
      float shadow = craterField(uv, 5.4, 3.1) * 0.16 + craterField(uv + 2.7, 10.0, 7.1) * 0.08;
      return 1.0 - shadow;
    }
    if (style < 3.5 && style > 2.5) {
      float relief = craterField(uv + 4.1, 6.2, 6.9) * 0.08 + ridgedFbm(uv * 15.0 + 9.0) * 0.08;
      return 0.92 + relief;
    }
    if (style < 4.5) {
      return 0.95 + smoothstep(0.62, 0.94, fbm(uv * 18.0)) * 0.05;
    }
    if (style < 5.5) {
      return 0.96 + smoothstep(0.60, 0.95, fbm(uv * 16.0)) * 0.04;
    }
    if (style < 6.5) {
      return 0.98 + fbm(uv * 12.0) * 0.02;
    }
    return 0.96 + smoothstep(0.58, 0.92, fbm(uv * 18.0 + 2.0)) * 0.04;
  }

  void main() {
    float style = floor(uPlanetStyle + 0.5);
    vec3 base;
    if (style < 0.5) base = mercury(vUv);
    else if (style < 1.5) base = venus(vUv);
    else if (style < 2.5) base = earth(vUv);
    else if (style < 3.5) base = mars(vUv);
    else if (style < 4.5) base = jupiter(vUv);
    else if (style < 5.5) base = saturn(vUv);
    else if (style < 6.5) base = uranus(vUv);
    else base = neptune(vUv);

    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 lightDirection = normalize(vec3(-0.48, 0.62, 0.74));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float hemisphere = normal.y * 0.5 + 0.5;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.1);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.7);
    float night = smoothstep(-0.42, 0.28, dot(normal, lightDirection));
    float softTerminator = smoothstep(-0.18, 0.24, dot(normal, lightDirection));
    float atmosphericScatter = pow(max(dot(normal, lightDirection) * 0.5 + 0.5, 0.0), 2.1);
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), style > 3.5 ? 42.0 : 34.0);
    vec3 atmo = atmosphereTint(style);

    vec3 color = base * (0.14 + diffuse * 0.84 + hemisphere * 0.11);
    color *= detailShadow(style, vUv);
    color *= mix(0.18, 1.0, night);
    color = mix(color * 0.88, color, softTerminator);
    color += atmo * rim * (0.08 + hazeStrength(style) * 0.84);
    color += atmo * fresnel * atmosphericScatter * (0.05 + hazeStrength(style) * 0.66);
    color += mix(vec3(0.22, 0.25, 0.31), vec3(0.96, 0.98, 1.0), step(1.5, style)) * specular * specularStrength(style);

    if (style > 1.5 && style < 2.5) {
      float oceanSpecular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 60.0);
      color += vec3(0.88, 0.96, 1.0) * oceanSpecular * 0.18;
    }

    float extraHaze = smoothstep(0.15, 1.0, diffuse + hemisphere * 0.14) * hazeStrength(style);
    color += atmo * extraHaze * 0.42 + vec3(1.0) * extraHaze * 0.03;
    gl_FragColor = vec4(pow(color, vec3(0.94)), 1.0);
  }
`;


const ringVertexShader = `
  attribute vec3 aPosition;
  attribute vec2 aUv;

  uniform float uAspect;
  uniform float uCameraDistance;
  uniform float uRingScale;
  uniform mat3 uRingRotation;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec3 localPosition = vec3(aPosition.x * uRingScale, aPosition.y, aPosition.z * uRingScale);
    vec3 position = uRingRotation * localPosition;
    position.z -= uCameraDistance;

    float fieldOfView = 1.72;
    float nearPlane = 0.1;
    float farPlane = 30.0;
    float depthA = (farPlane + nearPlane) / (nearPlane - farPlane);
    float depthB = (2.0 * farPlane * nearPlane) / (nearPlane - farPlane);
    gl_Position = vec4(position.x * fieldOfView / uAspect, position.y * fieldOfView, depthA * position.z + depthB, -position.z);
    vUv = aUv;
    vDepth = position.z;
  }
`;

const ringFragmentShader = `
  precision highp float;
  uniform vec3 uAccent;
  uniform float uRingOpacity;
  uniform float uRingPhase;
  uniform float uRingStyle;
  varying vec2 vUv;
  varying float vDepth;

  float hash(float value) {
    return fract(sin(value * 91.731) * 43758.5453);
  }

  void main() {
    float radius = vUv.x;
    float angle = fract(vUv.y + uRingPhase / 6.28318530718);
    float saturnBands = sin(radius * 176.0) * 0.5 + 0.5;
    float saturnFine = sin(radius * 420.0 + 0.7) * 0.5 + 0.5;
    float uranusBands = sin(radius * 105.0 + 1.2) * 0.5 + 0.5;
    float uranusSparse = sin(radius * 38.0 + 2.3) * 0.5 + 0.5;
    float saturnMode = 1.0 - step(0.5, uRingStyle);
    float bands = mix(saturnBands * 0.74 + saturnFine * 0.26, uranusBands * 0.55 + uranusSparse * 0.45, step(0.5, uRingStyle));
    float division = smoothstep(0.09, 0.19, abs(sin((radius + .035) * 49.0)));
    float fineDust = 0.74 + hash(floor(angle * 260.0) + floor(radius * 120.0) * 17.0) * 0.26;
    float arcs = 0.78 + 0.22 * sin(angle * 25.1327 + radius * 19.0);
    float chunkyParticles = 0.86 + hash(floor(angle * 64.0) + floor(radius * 48.0) * 33.0) * 0.22;
    float edge = smoothstep(0.0, 0.065, radius) * smoothstep(1.0, 0.90, radius);
    vec3 warmIce = mix(vec3(0.34, 0.25, 0.17), vec3(1.0, 0.92, 0.74), bands);
    vec3 coldIce = mix(vec3(0.20, 0.43, 0.49), vec3(0.75, 0.96, 0.98), bands);
    vec3 ice = mix(warmIce, coldIce, step(0.5, uRingStyle));
    vec3 color = mix(ice, uAccent, uRingStyle > 0.5 ? 0.18 : 0.06);
    float density = saturnMode * (0.32 + bands * 0.72) + step(0.5, uRingStyle) * (0.12 + bands * 0.34);
    float alpha = edge * density * division * fineDust * arcs * chunkyParticles * uRingOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

const atmosphereVertexShader = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;

  uniform float uAspect;
  uniform float uCameraDistance;
  uniform mat3 uModelRotation;
  uniform float uAtmosphereScale;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 position = uModelRotation * (aPosition * uAtmosphereScale);
    vec3 normal = uModelRotation * aNormal;
    position.z -= uCameraDistance;

    float fieldOfView = 1.72;
    float nearPlane = 0.1;
    float farPlane = 30.0;
    float depthA = (farPlane + nearPlane) / (nearPlane - farPlane);
    float depthB = (2.0 * farPlane * nearPlane) / (nearPlane - farPlane);
    gl_Position = vec4(position.x * fieldOfView / uAspect, position.y * fieldOfView, depthA * position.z + depthB, -position.z);
    vNormal = normalize(normal);
    vViewPosition = position;
  }
`;

const atmosphereFragmentShader = `
  precision highp float;
  uniform vec3 uAccent;
  uniform float uAtmosphereOpacity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 normal = normalize(vNormal);
    float facing = max(dot(normal, viewDirection), 0.0);
    float rim = pow(1.0 - facing, 2.15);
    float sunScatter = pow(max(dot(normal, normalize(vec3(-0.48, 0.62, 0.74))) * 0.5 + 0.5, 0.0), 1.8);
    float alpha = rim * uAtmosphereOpacity * (0.64 + sunScatter * 0.18);
    gl_FragColor = vec4(uAccent * (0.94 + rim * .18 + sunScatter * .08), alpha);
  }
`;

function hexToRgb(hex) {
  const normalized = String(hex || '#7c3aed').replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function createWebGLPlanetRenderer(canvas, { onInteraction } = {}) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });

  if (!gl) throw new Error('WebGL is not available in this browser.');

  const sphereProgram = createProgram(gl, vertexShader, fragmentShader);
  const ringProgram = createProgram(gl, ringVertexShader, ringFragmentShader);
  const atmosphereProgram = createProgram(gl, atmosphereVertexShader, atmosphereFragmentShader);
  const sphere = createSphereGeometry(84, 126);
  const ring = createRingGeometry(320, 1.22, 2.18);

  const sphereBuffers = {
    position: createBuffer(gl, gl.ARRAY_BUFFER, sphere.positions),
    normal: createBuffer(gl, gl.ARRAY_BUFFER, sphere.normals),
    uv: createBuffer(gl, gl.ARRAY_BUFFER, sphere.uvs),
    index: createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, sphere.indices)
  };
  const ringBuffers = {
    position: createBuffer(gl, gl.ARRAY_BUFFER, ring.positions),
    uv: createBuffer(gl, gl.ARRAY_BUFFER, ring.uvs),
    index: createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, ring.indices)
  };

  let planet = null;
  let orientation = quatIdentity();
  let spinAngle = 0;
  let cameraDistance = 3.2;
  let automaticRotation = true;
  let animationFrame = 0;
  let previousTime = performance.now();
  let disposed = false;
  let visible = document.visibilityState !== 'hidden';
  let activePointer = null;
  let dragStartVector = null;
  let dragStartOrientation = null;
  let previousDragVector = null;
  let previousDragTime = 0;
  let inertialAxis = [0, 1, 0];
  let inertialSpeed = 0;
  const pointers = new Map();
  let previousPinchDistance = 0;

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.35 : 1.85);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function getModelQuaternions() {
    const tilt = quatFromAxisAngle([0, 0, 1], planet?.viewer?.axialTilt ?? 0);
    const spin = quatFromAxisAngle([0, 1, 0], spinAngle);
    const base = quatMultiply(orientation, tilt);
    return {
      sphere: quatMultiply(base, spin),
      ring: base
    };
  }

  function setProjectionUniforms(program) {
    const aspect = canvas.width / Math.max(1, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), aspect);
    gl.uniform1f(gl.getUniformLocation(program, 'uCameraDistance'), cameraDistance);
  }

  function setAccent(program) {
    const [red, green, blue] = hexToRgb(planet?.accentColor);
    gl.uniform3f(gl.getUniformLocation(program, 'uAccent'), red, green, blue);
  }

  function drawSphere(time, rotations) {
    gl.useProgram(sphereProgram);
    bindAttribute(gl, sphereProgram, 'aPosition', sphereBuffers.position, 3);
    bindAttribute(gl, sphereProgram, 'aNormal', sphereBuffers.normal, 3);
    bindAttribute(gl, sphereProgram, 'aUv', sphereBuffers.uv, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
    setProjectionUniforms(sphereProgram);
    setAccent(sphereProgram);
    gl.uniformMatrix3fv(gl.getUniformLocation(sphereProgram, 'uModelRotation'), false, matrixFromQuaternion(rotations.sphere));
    gl.uniform1f(gl.getUniformLocation(sphereProgram, 'uPlanetStyle'), planet?.viewer?.styleIndex ?? 0);
    gl.uniform1f(gl.getUniformLocation(sphereProgram, 'uTime'), time * 0.001);
    gl.depthMask(true);
    gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function drawRings(rotations) {
    if (!planet?.viewer?.hasRings) return;
    gl.useProgram(ringProgram);
    bindAttribute(gl, ringProgram, 'aPosition', ringBuffers.position, 3);
    bindAttribute(gl, ringProgram, 'aUv', ringBuffers.uv, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringBuffers.index);
    setProjectionUniforms(ringProgram);
    setAccent(ringProgram);
    gl.uniformMatrix3fv(gl.getUniformLocation(ringProgram, 'uRingRotation'), false, matrixFromQuaternion(rotations.ring));
    gl.uniform1f(gl.getUniformLocation(ringProgram, 'uRingOpacity'), planet?.viewer?.ringOpacity ?? 0.95);
    gl.uniform1f(gl.getUniformLocation(ringProgram, 'uRingScale'), planet?.viewer?.ringScale ?? 1);
    gl.uniform1f(gl.getUniformLocation(ringProgram, 'uRingPhase'), spinAngle * (planet?.viewer?.ringMotion ?? 0.55));
    gl.uniform1f(gl.getUniformLocation(ringProgram, 'uRingStyle'), planet?.id === 'uranus' ? 1 : 0);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, ring.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);
  }

  function drawAtmosphere(rotations) {
    const opacity = planet?.viewer?.atmosphereOpacity ?? 0;
    if (opacity <= 0) return;
    gl.useProgram(atmosphereProgram);
    bindAttribute(gl, atmosphereProgram, 'aPosition', sphereBuffers.position, 3);
    bindAttribute(gl, atmosphereProgram, 'aNormal', sphereBuffers.normal, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
    setProjectionUniforms(atmosphereProgram);
    setAccent(atmosphereProgram);
    gl.uniformMatrix3fv(gl.getUniformLocation(atmosphereProgram, 'uModelRotation'), false, matrixFromQuaternion(rotations.sphere));
    gl.uniform1f(gl.getUniformLocation(atmosphereProgram, 'uAtmosphereScale'), planet?.viewer?.atmosphereScale ?? 1.035);
    gl.uniform1f(gl.getUniformLocation(atmosphereProgram, 'uAtmosphereOpacity'), opacity);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
  }

  function applyInertia(delta) {
    if (activePointer !== null || automaticRotation || inertialSpeed < 0.001) return;
    orientation = quatMultiply(quatFromAxisAngle(inertialAxis, inertialSpeed * delta), orientation);
    inertialSpeed *= Math.pow(0.055, delta);
  }

  function render(time) {
    if (disposed) return;
    const delta = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    if (automaticRotation && planet && visible) {
      spinAngle += (planet.viewer?.rotationSpeed ?? 0.12) * delta;
    }
    applyInertia(delta);
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (planet) {
      const rotations = getModelQuaternions();
      drawSphere(time, rotations);
      drawRings(rotations);
      drawAtmosphere(rotations);
    }
    animationFrame = requestAnimationFrame(render);
  }

  function notifyInteraction() {
    if (typeof onInteraction === 'function') onInteraction();
  }

  function updatePinch() {
    if (pointers.size !== 2) {
      previousPinchDistance = 0;
      return;
    }
    const [first, second] = [...pointers.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (previousPinchDistance > 0) {
      cameraDistance = clamp(cameraDistance - (distance - previousPinchDistance) * 0.008, 2.25, 5.4);
      notifyInteraction();
    }
    previousPinchDistance = distance;
  }

  function beginSinglePointer(event) {
    activePointer = event.pointerId;
    dragStartVector = mapPointerToTrackball(canvas, event.clientX, event.clientY);
    previousDragVector = dragStartVector;
    dragStartOrientation = [...orientation];
    previousDragTime = performance.now();
    inertialSpeed = 0;
  }

  function onPointerDown(event) {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) beginSinglePointer(event);
    automaticRotation = false;
    notifyInteraction();
    canvas.classList.add('is-dragging');
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    updatePinch();
    if (pointers.size !== 1 || event.pointerId !== activePointer || !dragStartVector || !dragStartOrientation) return;

    const currentVector = mapPointerToTrackball(canvas, event.clientX, event.clientY);
    const dragRotation = quaternionBetween(dragStartVector, currentVector);
    orientation = quatMultiply(dragRotation, dragStartOrientation);

    const now = performance.now();
    const elapsed = Math.max(8, now - previousDragTime) / 1000;
    if (previousDragVector) {
      const incrementalAxis = cross(previousDragVector, currentVector);
      const axisLength = Math.hypot(...incrementalAxis);
      if (axisLength > EPSILON) {
        inertialAxis = normalizeVector(incrementalAxis);
        inertialSpeed = clamp(Math.acos(clamp(dot(previousDragVector, currentVector), -1, 1)) / elapsed, 0, 7.5);
      }
    }
    previousDragVector = currentVector;
    previousDragTime = now;
    notifyInteraction();
  }

  function releasePointer(event) {
    pointers.delete(event.pointerId);
    if (event.pointerId === activePointer) {
      activePointer = null;
      dragStartVector = null;
      dragStartOrientation = null;
      previousDragVector = null;
      if (pointers.size === 1) {
        const [pointerId, point] = pointers.entries().next().value;
        beginSinglePointer({ pointerId, clientX: point.x, clientY: point.y });
      }
    }
    if (pointers.size === 0) canvas.classList.remove('is-dragging');
    updatePinch();
  }

  function onWheel(event) {
    event.preventDefault();
    cameraDistance = clamp(cameraDistance + event.deltaY * 0.0035, 2.25, 5.4);
    notifyInteraction();
  }

  function onDoubleClick(event) {
    event.preventDefault();
    resetView();
    notifyInteraction();
  }

  function onVisibilityChange() {
    visible = document.visibilityState !== 'hidden';
    previousTime = performance.now();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDoubleClick);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  animationFrame = requestAnimationFrame(render);

  function resetView(nextPlanet = planet) {
    cameraDistance = nextPlanet?.viewer?.cameraDistance ?? 3.2;
    orientation = quatFromEuler(
      nextPlanet?.viewer?.initialPitch ?? -0.16,
      nextPlanet?.viewer?.initialYaw ?? 0.34,
      nextPlanet?.viewer?.initialRoll ?? 0
    );
    spinAngle = nextPlanet?.viewer?.initialSpin ?? 0.32;
    automaticRotation = true;
    inertialSpeed = 0;
  }

  return {
    setPlanet(nextPlanet) {
      planet = nextPlanet;
      resetView(nextPlanet);
      canvas.style.setProperty('--planet-accent', nextPlanet.accentColor);
    },
    zoomIn() {
      cameraDistance = Math.max(2.25, cameraDistance - 0.28);
      notifyInteraction();
    },
    zoomOut() {
      cameraDistance = Math.min(5.4, cameraDistance + 0.28);
      notifyInteraction();
    },
    reset() {
      resetView();
    },
    setAutoRotation(enabled) {
      automaticRotation = Boolean(enabled);
      if (automaticRotation) inertialSpeed = 0;
    },
    toggleAutoRotation() {
      automaticRotation = !automaticRotation;
      if (automaticRotation) inertialSpeed = 0;
      return automaticRotation;
    },
    getAutoRotation() {
      return automaticRotation;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', releasePointer);
      canvas.removeEventListener('pointercancel', releasePointer);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDoubleClick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      Object.values(sphereBuffers).forEach((buffer) => gl.deleteBuffer(buffer));
      Object.values(ringBuffers).forEach((buffer) => gl.deleteBuffer(buffer));
      gl.deleteProgram(sphereProgram);
      gl.deleteProgram(ringProgram);
      gl.deleteProgram(atmosphereProgram);
    }
  };
}
