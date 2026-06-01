import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuiltBox } from "@/lib/box/types";

export type ViewPreset = "perspective" | "front" | "top" | "side";

interface Props {
  box: BuiltBox;
  view: ViewPreset;
}

export function Viewer3D({ box, view }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    radius: number;
    az: number;
    el: number;
    dragging: boolean;
    lastX: number;
    lastY: number;
    target: THREE.Vector3;
  } | null>(null);

  // setup
  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4efe6);

    const camera = new THREE.PerspectiveCamera(45, 1, 1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.05);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(1, 1.4, 0.8);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffe6c0, 0.4);
    dir2.position.set(-1, 0.4, -0.6);
    scene.add(dir2);

    const group = new THREE.Group();
    scene.add(group);

    const st = {
      renderer,
      scene,
      camera,
      group,
      radius: 400,
      az: -0.7,
      el: 0.5,
      dragging: false,
      lastX: 0,
      lastY: 0,
      target: new THREE.Vector3(),
    };
    stateRef.current = st;

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h || 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const updateCam = () => {
      const { radius, az, el, target } = st;
      camera.position.set(
        target.x + radius * Math.cos(el) * Math.sin(az),
        target.y + radius * Math.sin(el),
        target.z + radius * Math.cos(el) * Math.cos(az),
      );
      camera.lookAt(target);
    };

    const onDown = (e: PointerEvent) => {
      st.dragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onUp = () => {
      st.dragging = false;
      renderer.domElement.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
      if (!st.dragging) return;
      const dx = e.clientX - st.lastX;
      const dy = e.clientY - st.lastY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      if (e.shiftKey) {
        const panScale = st.radius * 0.0015;
        st.target.x -= dx * panScale * Math.cos(st.az);
        st.target.z += dx * panScale * Math.sin(st.az);
        st.target.y += dy * panScale;
      } else {
        st.az -= dx * 0.008;
        st.el = Math.max(-1.45, Math.min(1.45, st.el + dy * 0.008));
      }
      updateCam();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      st.radius = Math.max(40, Math.min(8000, st.radius * (1 + e.deltaY * 0.0012)));
      updateCam();
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    const loop = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    updateCam();
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // rebuild geometry when box changes
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { group } = st;
    while (group.children.length) {
      const c = group.children.pop()!;
      (c as THREE.Mesh).geometry?.dispose?.();
    }

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xd9b483,
      roughness: 0.72,
      metalness: 0.02,
    });
    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0xc99f6a,
      roughness: 0.75,
      metalness: 0.02,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a5a36 });

    for (const p of box.panels) {
      const [sx, sy, sz] = p.placement.size;
      const geo = new THREE.BoxGeometry(Math.max(sx, 0.4), Math.max(sy, 0.4), Math.max(sz, 0.4));
      const mat = p.id.startsWith("div") ? dividerMat : woodMat;
      const mesh = new THREE.Mesh(geo, mat);
      // map model (x,y,z) -> three (x, z, -y) so Z is up
      mesh.position.set(p.placement.pos[0], p.placement.pos[2], -p.placement.pos[1]);
      mesh.scale.set(1, 1, 1);
      // swap dims: our size is [x,y,z]; three uses y-up
      mesh.geometry = new THREE.BoxGeometry(
        Math.max(sx, 0.4),
        Math.max(sz, 0.4),
        Math.max(sy, 0.4),
      );
      group.add(mesh);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        edgeMat,
      );
      edges.position.copy(mesh.position);
      group.add(edges);
    }

    // frame the model
    const box3 = new THREE.Box3().setFromObject(group);
    const sphere = new THREE.Sphere();
    box3.getBoundingSphere(sphere);
    st.target.copy(sphere.center);
    st.radius = sphere.radius * 2.6;
    const { radius, az, el, target, camera } = st;
    camera.position.set(
      target.x + radius * Math.cos(el) * Math.sin(az),
      target.y + radius * Math.sin(el),
      target.z + radius * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
  }, [box]);

  // view presets
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const map: Record<ViewPreset, { az: number; el: number }> = {
      perspective: { az: -0.7, el: 0.5 },
      front: { az: 0, el: 0.02 },
      top: { az: 0, el: 1.45 },
      side: { az: Math.PI / 2, el: 0.02 },
    };
    const t = map[view];
    st.az = t.az;
    st.el = t.el;
    const { radius, az, el, target, camera } = st;
    camera.position.set(
      target.x + radius * Math.cos(el) * Math.sin(az),
      target.y + radius * Math.sin(el),
      target.z + radius * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
  }, [view]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
