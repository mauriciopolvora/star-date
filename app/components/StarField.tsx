"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

/**
 * Creates a sphere-like texture for star rendering
 * Uses canvas with radial gradient for a glowing sphere effect
 */
function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create 2D context");

  // Create soft outer glow
  context.globalAlpha = 0.3;
  context.filter = "blur(16px)";
  context.fillStyle = "white";
  context.beginPath();
  context.arc(64, 64, 40, 0, 2 * Math.PI);
  context.fill();

  // Create bright inner core
  context.globalAlpha = 1;
  context.filter = "blur(5px)";
  context.fillStyle = "white";
  context.beginPath();
  context.arc(64, 64, 16, 0, 2 * Math.PI);
  context.fill();

  return new THREE.CanvasTexture(canvas);
}

interface StarFieldProps {
  showDebug?: boolean;
}

export function StarField({ showDebug = false }: StarFieldProps) {
  const { scene } = useThree();

  useEffect(() => {
    // Load binary position data
    let isMounted = true;

    async function loadStars() {
      try {
        // Fetch positions
        const posResponse = await fetch("/gcns-positions.bin");
        const posBuffer = await posResponse.arrayBuffer();
        const positions = new Float32Array(posBuffer);

        if (!isMounted) return;

        if (showDebug) {
          console.log(`Loaded ${positions.length / 3} stars`);
          
          // Efficiently find min/max without spreading large arrays
          let posMin = positions[0];
          let posMax = positions[0];
          for (let i = 0; i < positions.length; i++) {
            posMin = Math.min(posMin, positions[i]);
            posMax = Math.max(posMax, positions[i]);
          }
          
          console.log(`Position range:`, {
            min: posMin,
            max: posMax,
          });
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position", 
          new THREE.BufferAttribute(positions, 3),
        );

        // Create material with sphere-like texture
        const starTexture = createStarTexture();
        const material = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.1,
          sizeAttenuation: true,
          map: starTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          fog: false,
        });

        // Create and add points to scene
        const points = new THREE.Points(geometry, material);
        points.renderOrder = 100; // Render stars on top
        points.frustumCulled = false; // Never cull star field
        scene.add(points);

        return () => {
          scene.remove(points);
          geometry.dispose();
          material.dispose();
        };
      } catch (err) {
        console.error("Failed to load star data:", err);
      }
    }

    let cleanup: (() => void) | undefined;
    loadStars().then((c) => {
      cleanup = c;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [scene, showDebug]);

  return null;
}
