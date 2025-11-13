"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SelectedStarInfo } from "./ControlsUI";

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

const BASE_POINT_SIZE = 0.25;

interface StarRecord {
  i: number | string;
  n?: string;
  x: number;
  y: number;
  z: number;
  p?: number;
  N?: number;
  K?: { r?: number; g?: number; b?: number };
}

interface StarFieldProps {
  showDebug?: boolean;
  brightness?: number;
  onLoaded?: () => void;
  onStarSelected?: (star: SelectedStarInfo | null) => void;
  selectedStarIndex?: number | null;
}

export function StarField({
  showDebug = false,
  // fallback brightness value
  brightness = 1,
  onLoaded,
  onStarSelected,
  selectedStarIndex = null,
}: StarFieldProps) {
  const { scene, gl, camera, raycaster } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const starDataRef = useRef<StarRecord[] | null>(null);
  const brightnessRef = useRef(brightness);
  brightnessRef.current = brightness;

  useEffect(() => {
    let isMounted = true;

    async function loadStars() {
      try {
        const response = await fetch("/bsc5p_3d_min.json");
        if (!response.ok) {
          throw new Error(`Failed to load star catalog: ${response.status}`);
        }

        const catalogJson = await response.json();
        if (!isMounted) return;

        if (!Array.isArray(catalogJson)) {
          throw new Error("Star catalog JSON is not an array");
        }

        const starList = catalogJson as StarRecord[];

        starDataRef.current = starList;
        const starCount = starList.length;

        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const luminosityLogs = new Float32Array(starCount);
        const starIndices = new Float32Array(starCount);

        let minLog = Number.POSITIVE_INFINITY;
        let maxLog = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < starCount; i++) {
          const star = starList[i];
          const px = Number.isFinite(star.x) ? star.x : 0;
          const py = Number.isFinite(star.y) ? star.y : 0;
          const pz = Number.isFinite(star.z) ? star.z : 0;

          positions[i * 3] = px;
          positions[i * 3 + 1] = py;
          positions[i * 3 + 2] = pz;

          const color = star.K ?? {};
          colors[i * 3] = clampColorComponent(color.r);
          colors[i * 3 + 1] = clampColorComponent(color.g);
          colors[i * 3 + 2] = clampColorComponent(color.b);

          const luminosity = Math.max(star.N ?? 0, 0);
          const logValue = Math.log10(luminosity + 1);
          luminosityLogs[i] = logValue;
          minLog = Math.min(minLog, logValue);
          maxLog = Math.max(maxLog, logValue);

          starIndices[i] = i;
        }

        if (starCount === 0) {
          minLog = 0;
        }

        let logRange = maxLog - minLog;
        if (!Number.isFinite(logRange) || logRange <= 0) {
          logRange = 1;
        }
        const luminosityNormalized = new Float32Array(starCount);
        for (let i = 0; i < starCount; i++) {
          luminosityNormalized[i] = (luminosityLogs[i] - minLog) / logRange;
        }

        if (showDebug) {
          console.log(`Loaded ${starCount} stars from BSC5P catalog`);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "starColor",
          new THREE.BufferAttribute(colors, 3),
        );
        geometry.setAttribute(
          "luminosity",
          new THREE.BufferAttribute(luminosityNormalized, 1),
        );
        geometry.setAttribute(
          "starIndex",
          new THREE.BufferAttribute(starIndices, 1),
        );
        geometry.computeBoundingSphere();

        const starTexture = createStarTexture();

        const vertexShader = `
          attribute vec3 starColor;
          attribute float luminosity;
          attribute float starIndex;
          uniform float baseSize;
          uniform float selectedIndex;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vIsSelected;
          
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

            float lumInfluence = pow(luminosity, 0.7);
            float size = baseSize * mix(0.8, 6.0, lumInfluence);

            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            vColor = starColor;
            vAlpha = mix(0.4, 1.0, luminosity);
            vIsSelected = abs(selectedIndex - starIndex) < 0.5 ? 1.0 : 0.0;
          }
        `;

        const fragmentShader = `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vIsSelected;
          
          void main() {
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            vec3 baseColor = vColor;
            vec3 selectedColor = vec3(1.0, 0.2, 0.2);
            vec3 color = mix(baseColor, selectedColor, vIsSelected);
            gl_FragColor = vec4(color, texColor.a * vAlpha);
          }
        `;

        const material = new THREE.ShaderMaterial({
          uniforms: {
            pointTexture: { value: starTexture },
            baseSize: { value: BASE_POINT_SIZE * brightnessRef.current },
            selectedIndex: { value: -1 },
          },
          vertexShader,
          fragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending, // Makes stars glow
          depthWrite: false,
          depthTest: true,
          fog: false,
        });
        materialRef.current = material;

    // Create point cloud and add to scene
    const points = new THREE.Points(geometry, material);
        points.renderOrder = 100; // Render stars on top of other objects
        points.frustumCulled = false; // Never cull the star field
        scene.add(points);

    // Attach DOM-level pointer listeners for star picking
    const domElement = gl.domElement;
        const pointerVector = new THREE.Vector2();
        const prevCursor = domElement.style.cursor;
        let isHovering = false;
        let pointerIsDown = false;
        let pointerMoved = false;
        let downPosition: { x: number; y: number } | null = null;
    const originalThreshold = raycaster.params.Points.threshold;
    raycaster.params.Points.threshold = 0.7; // Slightly widen hit area for easier selection

        const computeIntersectionIndex = (clientX: number, clientY: number) => {
          const rect = domElement.getBoundingClientRect();
          pointerVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointerVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(pointerVector, camera);
          const intersections = raycaster.intersectObject(points, false);

          if (intersections.length === 0) {
            return null;
          }

          const intersection = intersections[0];
          return intersection.index != null ? intersection.index : null;
        };

        const updateHoverState = (event: PointerEvent) => {
          const index = computeIntersectionIndex(event.clientX, event.clientY);
          const hovering = index != null;

          if (hovering !== isHovering) {
            isHovering = hovering;
            domElement.style.cursor = isHovering ? "pointer" : prevCursor;
          }
        };

        const handlePointerDown = (event: PointerEvent) => {
          pointerIsDown = true;
          pointerMoved = false;
          downPosition = { x: event.clientX, y: event.clientY };
        };

        const handlePointerMove = (event: PointerEvent) => {
          if (pointerIsDown && downPosition) {
            const dx = Math.abs(event.clientX - downPosition.x);
            const dy = Math.abs(event.clientY - downPosition.y);
            if (dx > 2 || dy > 2) {
              pointerMoved = true;
            }
          }

          updateHoverState(event);
        };

        const handlePointerLeave = () => {
          isHovering = false;
          domElement.style.cursor = prevCursor;
        };

        const handlePointerUp = (event: PointerEvent) => {
          if (!pointerIsDown) {
            return;
          }

          pointerIsDown = false;
          downPosition = null;

          if (pointerMoved) {
            updateHoverState(event);
            return;
          }

          const index = computeIntersectionIndex(event.clientX, event.clientY);

          if (index == null) {
            onStarSelected?.(null);
            if (materialRef.current) {
              materialRef.current.uniforms.selectedIndex.value = -1;
            }
            updateHoverState(event);
            return;
          }

          const positionIndex = index * 3;
          const x = positions[positionIndex];
          const y = positions[positionIndex + 1];
          const z = positions[positionIndex + 2];
          const star = starDataRef.current?.[index];
          if (!star) {
            onStarSelected?.(null);
            if (materialRef.current) {
              materialRef.current.uniforms.selectedIndex.value = -1;
            }
            updateHoverState(event);
            return;
          }

          const distanceParsec =
            typeof star.p === "number" && Number.isFinite(star.p)
              ? star.p
              : Math.sqrt(x * x + y * y + z * z);
          const distanceLightYears = distanceParsec * 3.26156;
          const rgb: [number, number, number] = [
            clampColorComponent(star.K?.r),
            clampColorComponent(star.K?.g),
            clampColorComponent(star.K?.b),
          ];

          const selection: SelectedStarInfo = {
            index,
            id: star.i,
            name: star.n ?? `Star ${star.i}`,
            position: [x, y, z],
            distanceParsec,
            distanceLightYears,
            luminosity: star.N ?? 0,
            colorRGB: rgb,
          };

          if (materialRef.current) {
            materialRef.current.uniforms.selectedIndex.value = index;
          }
          onStarSelected?.(selection);

          updateHoverState(event);
        };

        domElement.addEventListener("pointerdown", handlePointerDown);
        domElement.addEventListener("pointermove", handlePointerMove);
        domElement.addEventListener("pointerleave", handlePointerLeave);
        domElement.addEventListener("pointerup", handlePointerUp);

        // Notify parent that stars are loaded (so Earth can appear)
        onLoaded?.();

        return () => {
          scene.remove(points);
          geometry.dispose();
          material.dispose();
          materialRef.current = null;
          starDataRef.current = null;
          domElement.style.cursor = prevCursor;
          raycaster.params.Points.threshold = originalThreshold;
          domElement.removeEventListener("pointerdown", handlePointerDown);
          domElement.removeEventListener("pointermove", handlePointerMove);
          domElement.removeEventListener("pointerleave", handlePointerLeave);
          domElement.removeEventListener("pointerup", handlePointerUp);
          onStarSelected?.(null);
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
  }, [scene, gl, camera, raycaster, showDebug, onLoaded, onStarSelected]);

  useEffect(() => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.selectedIndex.value = selectedStarIndex ?? -1;
  }, [selectedStarIndex]);

  useEffect(() => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.baseSize.value = BASE_POINT_SIZE * brightness;
  }, [brightness]);

  return null;
}

function clampColorComponent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
