uniform float time;
uniform bool use_recovery_data;
attribute float confirmed_time;
varying float var_confirmed_time;
attribute float recovered_time;
varying float var_recovered_time;
attribute float dead_time;
varying float var_dead_time;
varying float circle_blend_factor;

const float minsize = 1.;
const float maxsize = 7.;
const float dead_maxsize = 14.;
const float big_value = 1e30;

void main() {
  var_confirmed_time = confirmed_time;
  var_recovered_time = use_recovery_data ? recovered_time : big_value;
  var_dead_time = dead_time;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float x = time - confirmed_time;
  float y = time - dead_time;

  if (x < 0.)
    x = 0.;
  else
    x = mix(minsize, maxsize, exp(-x));

  if (y >= 0.)
    x = mix(minsize, dead_maxsize, exp(-y));

  circle_blend_factor = min(max(0., x - 1.), 1.);

  gl_PointSize = x;
  gl_Position = projectionMatrix * mvPosition;
}
