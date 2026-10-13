"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const RED = 0xd90429;

// Faceted red core inside a white wireframe globe, an orbit ring, floating
// shards and a particle field.
//
// Interaction, with mouse, pen or touch:
// - drag in any direction to turn the globe like a trackball, with momentum
// - pinch (two fingers) to zoom in and out
// - click or tap for a shockwave pulse
// - with a mouse, the scene also leans slightly towards the pointer
//
// The globe spins steadily on its own (more slowly with reduced motion, where
// the other ambient movement stays still), pauses while it is dragged and
// eases back into its spin afterwards. Rendering pauses when off screen.
export default function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL: the static backdrop behind the canvas remains.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = 7.5;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(RED, 30, 20);
    rimLight.position.set(-4, -2, 2);
    scene.add(rimLight);

    // rig follows the pointer; spinner carries the drag rotation.
    const rig = new THREE.Group();
    scene.add(rig);
    const spinner = new THREE.Group();
    rig.add(spinner);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({
        color: RED,
        flatShading: true,
        metalness: 0.35,
        roughness: 0.35,
      }),
    );
    spinner.add(core);

    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.35, 1)),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
      }),
    );
    spinner.add(shell);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    spinner.add(ring);

    const satellite = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshBasicMaterial({ color: RED }),
    );
    ring.add(satellite);

    // Shockwave shown when the scene is clicked.
    const pulse = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.02, 8, 120),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 }),
    );
    rig.add(pulse);
    let pulseStart = -Infinity;

    // Small shards on their own orbits, at different depths for parallax.
    const small = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: true,
      metalness: 0.2,
      roughness: 0.4,
    });
    const shardGeometry = new THREE.OctahedronGeometry(0.14, 0);
    const shards = Array.from({ length: small ? 6 : 12 }, (_, i) => {
      const mesh = new THREE.Mesh(shardGeometry, i % 3 === 0 ? core.material : shardMaterial);
      const orbit = {
        radius: 2.6 + Math.random() * 1.4,
        speed: 0.15 + Math.random() * 0.35,
        offset: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.6,
        scale: 0.6 + Math.random() * 0.9,
      };
      mesh.scale.setScalar(orbit.scale);
      rig.add(mesh);
      return { mesh, orbit };
    });

    const COUNT = small ? 350 : 700;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Even distribution over a spherical shell.
      const radius = 3.4 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.035,
        transparent: true,
        opacity: 0.7,
      }),
    );
    scene.add(particles);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Mouse position for the gentle lean (mouse only; touch has no hover).
    const pointer = { x: 0, y: 0 };
    // Active pointers on the canvas, for drag and pinch.
    const touches = new Map<number, { x: number; y: number }>();
    const drag = { moved: 0, pinch: 0, lastMove: 0 };
    // Angular velocity (radians per frame) around the screen's X and Y axes.
    const spin = { x: 0, y: 0 };
    let zoom = 1;
    // Steady spin around the vertical axis, in radians per second.
    let idle = 0;
    let lastTime = 0;
    const xAxis = new THREE.Vector3(1, 0, 0);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const turn = new THREE.Quaternion();

    const pinchDistance = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onWindowPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduceMotion.matches) return;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onPointerDown = (event: PointerEvent) => {
      mount.setPointerCapture(event.pointerId);
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      drag.moved = 0;
      if (touches.size === 2) drag.pinch = pinchDistance();
      mount.style.cursor = "grabbing";
      wake();
    };
    const onPointerMove = (event: PointerEvent) => {
      const last = touches.get(event.pointerId);
      if (!last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last.x = event.clientX;
      last.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.lastMove = performance.now();

      if (touches.size >= 2) {
        // Pinch: the distance between the two fingers sets the zoom.
        const distance = pinchDistance();
        if (drag.pinch) zoom = Math.min(1.3, Math.max(0.75, zoom * (distance / drag.pinch)));
        drag.pinch = distance;
      } else {
        // Drag: the globe follows the finger or mouse directly…
        const speed = 0.006;
        spin.y = dx * speed;
        spin.x = dy * speed;
        applySpin();
      }
      wake();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (!touches.has(event.pointerId)) return;
      // …and a short press without movement sends a pulse.
      if (touches.size === 1 && drag.moved < 8 && event.type === "pointerup") {
        pulseStart = performance.now();
      }
      // Held still before letting go: no fling.
      if (performance.now() - drag.lastMove > 80) spin.x = spin.y = 0;
      touches.delete(event.pointerId);
      if (touches.size < 2) drag.pinch = 0;
      if (!touches.size) mount.style.cursor = "";
      wake();
    };

    // Turns the globe around the screen axes, whatever its current orientation,
    // so dragging always moves the side under the finger.
    function applySpin() {
      turn.setFromAxisAngle(yAxis, spin.y);
      spinner.quaternion.premultiply(turn);
      turn.setFromAxisAngle(xAxis, spin.x);
      spinner.quaternion.premultiply(turn);
    }

    const draw = (time: number) => {
      // With reduced motion the scene keeps a fixed pose of its own and only
      // moves when the visitor drags it.
      const t = reduceMotion.matches ? 0 : time / 1000;
      core.rotation.set(t * 0.25, t * 0.35, 0);

      // Momentum after the drag is released.
      if (!touches.size) {
        applySpin();
        spin.y *= 0.95;
        spin.x *= 0.95;
        if (Math.abs(spin.x) < 1e-5) spin.x = 0;
        if (Math.abs(spin.y) < 1e-5) spin.y = 0;
      }

      // Steady spin: stops while dragged, then eases back in. Frame-rate
      // independent, and capped so a long pause does not cause a jump.
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;
      const target = touches.size ? 0 : reduceMotion.matches ? 0.25 : 0.5;
      idle += (target - idle) * Math.min(dt * 2, 1);
      if (idle > 1e-4) {
        turn.setFromAxisAngle(yAxis, idle * dt);
        spinner.quaternion.premultiply(turn);
      }
      const z = 7.5 / Math.min(camera.aspect * 1.1, 1) / zoom;
      camera.position.z += (z - camera.position.z) * 0.15;

      // Shockwave and a short squash of the core.
      const p = (time - pulseStart) / 900;
      if (p >= 0 && p < 1) {
        pulse.scale.setScalar(1 + p * 2.4);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
        core.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.18);
      } else {
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0;
        core.scale.setScalar(1);
      }
      pulse.rotation.set(Math.PI / 2.4, 0, 0);

      for (const { mesh, orbit } of shards) {
        const a = orbit.offset + t * orbit.speed;
        mesh.position.set(
          Math.cos(a) * orbit.radius,
          Math.sin(a * 1.3) * orbit.tilt,
          Math.sin(a) * orbit.radius * 0.6,
        );
        mesh.rotation.set(t * orbit.speed * 2, t * orbit.speed * 3, 0);
      }
      shell.rotation.set(-t * 0.08, -t * 0.12, 0);
      ring.rotation.z = t * 0.2;
      satellite.position.set(Math.cos(t * 0.9) * 3.05, Math.sin(t * 0.9) * 3.05, 0);
      particles.rotation.y = t * 0.02;
      rig.position.y = Math.sin(t * 0.8) * 0.12;
      if (reduceMotion.matches) pointer.x = pointer.y = 0;
      rig.rotation.y += (pointer.x * 0.35 - rig.rotation.y) * 0.04;
      rig.rotation.x += (pointer.y * 0.25 - rig.rotation.x) * 0.04;
      renderer.render(scene, camera);
    };

    // The loop runs while the scene is on screen (the globe always spins).
    let frame = 0;
    let running = false;
    let visible = true;
    const loop = (time: number) => {
      draw(time);
      if (visible) {
        frame = requestAnimationFrame(loop);
      } else {
        running = false;
        lastTime = 0;
      }
    };
    function wake() {
      if (running || !visible) return;
      running = true;
      frame = requestAnimationFrame(loop);
    }
    const restart = () => {
      cancelAnimationFrame(frame);
      running = false;
      draw(performance.now());
      wake();
    };

    const resize = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      // Pull back in portrait frames so the orbit ring is not cropped.
      camera.position.z = 7.5 / Math.min(camera.aspect * 1.1, 1) / zoom;
      camera.updateProjectionMatrix();
      draw(performance.now());
    });
    resize.observe(mount);

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    visibility.observe(mount);

    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerEnd);
    mount.addEventListener("pointercancel", onPointerEnd);
    reduceMotion.addEventListener("change", restart);
    restart();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onWindowPointerMove);
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerEnd);
      mount.removeEventListener("pointercancel", onPointerEnd);
      reduceMotion.removeEventListener("change", restart);
      shardGeometry.dispose();
      shardMaterial.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // touch-none hands every touch on the globe to the scene, so one finger
  // turns it and two fingers zoom instead of scrolling or zooming the page.
  return (
    <div
      ref={mountRef}
      title="Drag to turn, pinch to zoom, tap for a pulse"
      className="absolute inset-0 cursor-grab touch-none select-none"
    />
  );
}
