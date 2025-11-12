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
    let isMounted = true;

    async function loadStars() {
      try {
        // Fetch binary position data (x, y, z coordinates)
        const posResponse = await fetch("/gcns-positions.bin");
        const posBuffer = await posResponse.arrayBuffer();
        const positions = new Float32Array(posBuffer);

        // Fetch magnitude data (brightness values)
        const magResponse = await fetch("/gcns-mag.bin");
        const magBuffer = await magResponse.arrayBuffer();
        const magnitudes = new Float32Array(magBuffer);

        if (!isMounted) return;

        if (showDebug) {
          console.log(`Loaded ${positions.length / 3} stars`);

          // Calculate position range for debugging
          let posMin = positions[0];
          let posMax = positions[0];
          for (let i = 0; i < positions.length; i++) {
            posMin = Math.min(posMin, positions[i]);
            posMax = Math.max(posMax, positions[i]);
          }

          console.log(`Position range: ${posMin} to ${posMax}`);
        }

        // Create geometry with position and magnitude attributes
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "magnitude",
          new THREE.BufferAttribute(magnitudes, 1),
        );

        const starTexture = createStarTexture();

        // Custom shader: sizes stars based on magnitude (lower magnitude = brighter/bigger)
        const vertexShader = `
          attribute float magnitude;
          uniform float baseSize;
          varying float vAlpha;
          
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Normalize magnitude to 0-1 range (inverted so bright=1, dim=0)
            // Real star magnitudes: -2 (very bright) to 8 (very dim)
            float clampedMag = clamp(magnitude, -2.0, 8.0);
            float normalizedMag = (8.0 - clampedMag) / 10.0;
            
            // Calculate size: power curve (0.6) controls variation, multiplier (5.0) controls overall size
            float size = baseSize * pow(normalizedMag, 0.6) * 5.0;
            
            // Apply distance-based sizing (stars get smaller as camera moves away)
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            
            // Set opacity for more uniform brightness (0.5-1.0 range)
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
          blending: THREE.AdditiveBlending, // Makes stars glow
          depthWrite: false,
          depthTest: true,
          fog: false,
        });

        // Create point cloud and add to scene
        const points = new THREE.Points(geometry, material);
        points.renderOrder = 100; // Render stars on top of other objects
        points.frustumCulled = false; // Never cull the star field
        scene.add(points);

        // Notify parent that stars are loaded (so Earth can appear)
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
