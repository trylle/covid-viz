import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import ThreeGlobe from "three-globe";
import * as d3 from "d3";
import { cartesian2Polar } from "./three-globe";

export const initScene = (element: HTMLDivElement) => {
  const globe = new ThreeGlobe({ animateIn: false })
    .globeImageUrl("./BATH_50M_2.png")
    .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png");

  globe.globeMaterial().polygonOffset = true;
  globe.globeMaterial().polygonOffsetFactor = 1;
  globe.globeMaterial().polygonOffsetUnits = 1;

  globe.showAtmosphere(true);

  const renderer = new THREE.WebGLRenderer();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  element.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xbbbbbb));
  scene.add(new THREE.DirectionalLight(0xffffff, 0.6));
  scene.add(globe);

  camera.position.x = 200;
  camera.position.y = 200;

  const cameraControls = new OrbitControls(camera, renderer.domElement);

  cameraControls.minDistance = 101;
  cameraControls.rotateSpeed = 0.5;
  cameraControls.zoomSpeed = 1.6;

  // Handle resize
  const updateSize = () => {
    const { width, height } = element.getBoundingClientRect();

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(updateSize);

  resizeObserver.observe(element);

  (function animate() {
    cameraControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();

  return { renderer, scene, camera, globe };
};

export function createLatLngClickHandler({
  renderer,
  globe,
  camera,
  onClick,
}: {
  renderer: THREE.WebGLRenderer;
  globe: ThreeGlobe;
  camera: THREE.PerspectiveCamera;
  onClick: Function;
}) {
  const element = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let startEvent: { clientX: number; clientY: number } = { clientX: 0, clientY: 0 };

  const getEventPos = () => {
    return {
      clientX: d3.event.clientX ?? d3.event.changedTouches[0].clientX,
      clientY: d3.event.clientY ?? d3.event.changedTouches[0].clientY,
    };
  };

  const onClickGlobe = () => {
    const eventPos = getEventPos();

    const delta = Math.sqrt(Math.pow(startEvent.clientX - eventPos.clientX, 2) + Math.pow(startEvent.clientY - eventPos.clientY, 2));

    if (delta > 5) return; // drag, not click

    const { width, height } = element.getBoundingClientRect();

    mouse.x = (eventPos.clientX / width) * 2 - 1;
    mouse.y = -(eventPos.clientY / height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects([globe], true);

    if (intersects.length > 0) {
      const latlng = cartesian2Polar(intersects[0].point);

      onClick(latlng);
    } else onClick();
  };

  const sel = d3.select(element);

  const setStartEvent = () => {
    startEvent = getEventPos();
  };

  sel.on("mousedown", setStartEvent);
  sel.on("click", onClickGlobe);
  sel.on("touchstart", setStartEvent);
  sel.on("touchend", onClickGlobe);
}
