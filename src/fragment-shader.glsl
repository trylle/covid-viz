uniform float time;
uniform float extinction_time;
uniform bool keep_deaths;
varying float var_confirmed_time;
varying float var_recovered_time;
varying float var_dead_time;
varying float circle_blend_factor;

const vec3 confirmed_color = vec3(0., 0., 1.);
const vec3 recovered_color = vec3(0., .25, 0.);
const vec3 dead_color = vec3(1., 0., 0.);

const float big_value = 1e30;

void main() {
  float x = time - var_confirmed_time;
  float y = x;

  if (x < 0.)
    x = 0.;
  else
    x = 1.;
  if (y < 0.)
    y = 0.;
  else
    y = exp(-y * 10.);

  float blend = max(0., 1. - length(gl_PointCoord.st * 2. - 1.));
  float blur = .01;

  blend = smoothstep(.5 - blur, .5 + blur, blend);
  blend = mix(1., blend, circle_blend_factor);

  float extinct_time = var_confirmed_time + extinction_time;

  if (keep_deaths && var_dead_time < big_value) {
    extinct_time = big_value;
  }

  float z = time - extinct_time;

  if (z >= 0.)
    blend = mix(0., blend, exp(-z));

  vec3 color = confirmed_color * x;

  color = mix(color, recovered_color,
              max(0., min(1., time - var_recovered_time - 1.)));

  if (time - var_dead_time >= 0.)
    color = dead_color;

  color += vec3(1e-2);

  gl_FragColor = vec4(color, blend * x);
}