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
  brightness?: number;
  onLoaded?: () => void;
}

export function StarField({
  showDebug = false,
  brightness = 2,
  onLoaded,
}: StarFieldProps) {
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

        // Fetch magnitudes
        const magResponse = await fetch("/gcns-mag.bin");
        const magBuffer = await magResponse.arrayBuffer();
        const magnitudes = new Float32Array(magBuffer);

        if (!isMounted) return;

        if (showDebug) {
          console.log(`Loaded ${positions.length / 3} stars`);
          console.log(`Magnitudes array length: ${magnitudes.length}`);

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
        geometry.setAttribute(
          "magnitude",
          new THREE.BufferAttribute(magnitudes, 1),
        );

        // Create material with sphere-like texture and magnitude-based sizing
        const starTexture = createStarTexture();

        // Custom shader for magnitude-based sizing
        const vertexShader = `
          attribute float magnitude;
          uniform float baseSize;
          varying float vAlpha;
          
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Convert magnitude to size (lower magnitude = brighter = larger)
            // Typical visible range: -1.5 to +6.5 magnitude
            // Clamp magnitude and invert scale
            float clampedMag = clamp(magnitude, -2.0, 8.0);
            float normalizedMag = (8.0 - clampedMag) / 10.0;
            // Reduced power (0.7 instead of 1.5) and increased multiplier for less variation
            float size = baseSize * pow(normalizedMag, 0.6) * 5.0;
            
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            
            // More uniform brightness - narrower range (0.5-1.0 instead of 0.2-1.0)
            vAlpha = normalizedMag * 0.5 + 0.5;
          }
        `;

        const fragmentShader = `
          uniform sampler2D pointTexture;
          varying float vAlpha;
          
          void main() {
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            gl_FragColor = vec4(1.0, 1.0, 1.0, texColor.a * vAlpha);
          }
        `;

        const material = new THREE.ShaderMaterial({
          uniforms: {
            pointTexture: { value: starTexture },
            baseSize: { value: 0.25 * brightness },
          },
          vertexShader,
          fragmentShader,
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

        // Notify that stars are loaded
        onLoaded?.();

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
  }, [scene, showDebug, brightness, onLoaded]);

  return null;
}
