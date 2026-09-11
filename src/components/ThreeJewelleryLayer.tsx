"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ARTransform, JewelleryProduct } from "@/types";

interface Props {
  product: JewelleryProduct;
  transform: ARTransform;
}

export default function ThreeJewelleryLayer({ product, transform }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !product.model3dUrl) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x332211, 2.0));
    const key = new THREE.DirectionalLight(0xffe0a3, 3.2);
    key.position.set(2, 3, 4);
    scene.add(key);

    const loader = new GLTFLoader();
    loader.load(
      product.model3dUrl,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        scene.add(model);
      },
      undefined,
      (error) => console.warn("3D model load failed. Add a valid GLB at", product.model3dUrl, error)
    );

    const resize = () => {
      const rect = host.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      modelRef.current?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [product.model3dUrl]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.visible = transform.visible;

    // Convert normalized camera coordinates into our orthographic scene.
    model.position.set((transform.x - 0.5) * 2, -((transform.y - 0.5) * 2), 0);
    const s = transform.scale * 2.4;
    model.scale.setScalar(s);
    model.rotation.set(transform.pitch * 0.35, transform.yaw * 0.65, transform.rotationZ);
  }, [transform]);

  return <div ref={hostRef} className="threeLayer" aria-hidden="true" />;
}
