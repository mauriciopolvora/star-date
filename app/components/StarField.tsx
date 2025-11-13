"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
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
const LY_PER_PARSEC = 3.26156;
const CORE_BASE_SCALE = 0.05;
const GLOW_BASE_SCALE = 0.1;

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

interface StarRecordDerived extends StarRecord {
  distanceParsec: number;
  distanceLightYears: number;
}

interface StarFieldProps {
  showDebug?: boolean;
  brightness?: number;
  onLoaded?: () => void;
  onStarSelected?: (star: SelectedStarInfo | null) => void;
  selectedStarIndex?: number | null;
  birthdayAgeYears?: number | null;
  birthdayAgeTolerance?: number;
  onBirthdayMatchesChange?: (stars: SelectedStarInfo[]) => void;
}

export function StarField({
  showDebug = false,
  // fallback brightness value
  brightness = 1,
  onLoaded,
  onStarSelected,
  selectedStarIndex = null,
  birthdayAgeYears = null,
  birthdayAgeTolerance = 0.75,
  onBirthdayMatchesChange,
}: StarFieldProps) {
  const { scene, gl, camera, raycaster } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const starDataRef = useRef<StarRecordDerived[] | null>(null);
  const brightnessRef = useRef(brightness);
  brightnessRef.current = brightness;
  const highlightGroupRef = useRef<THREE.Group | null>(null);
  const highlightResourcesRef = useRef<{
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
  } | null>(null);
  const [starDataVersion, setStarDataVersion] = useState(0);

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

        const starListRaw = catalogJson as StarRecord[];
        const starCount = starListRaw.length;
        const starList: StarRecordDerived[] = new Array(starCount);

        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const luminosityLogs = new Float32Array(starCount);
        const starIndices = new Float32Array(starCount);

        let minLog = Number.POSITIVE_INFINITY;
        let maxLog = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < starCount; i++) {
          const rawStar = starListRaw[i];
          const px = Number.isFinite(rawStar.x) ? rawStar.x : 0;
          const py = Number.isFinite(rawStar.y) ? rawStar.y : 0;
          const pz = Number.isFinite(rawStar.z) ? rawStar.z : 0;

          const distanceParsec =
            typeof rawStar.p === "number" && Number.isFinite(rawStar.p)
              ? rawStar.p
              : Math.sqrt(px * px + py * py + pz * pz);
          const distanceLightYears = distanceParsec * LY_PER_PARSEC;

          const star: StarRecordDerived = {
            ...rawStar,
            x: px,
            y: py,
            z: pz,
            distanceParsec,
            distanceLightYears,
          };
          starList[i] = star;

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

        starDataRef.current = starList;
        setStarDataVersion((version) => version + 1);

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

          const distanceParsec = star.distanceParsec;
          const distanceLightYears = star.distanceLightYears;
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
          const highlightGroup = highlightGroupRef.current;
          if (highlightGroup) {
            scene.remove(highlightGroup);
            highlightGroupRef.current = null;
          }
          const highlightResources = highlightResourcesRef.current;
          if (highlightResources) {
            for (const geometryItem of highlightResources.geometries) {
              geometryItem.dispose();
            }
            for (const materialItem of highlightResources.materials) {
              materialItem.dispose();
            }
            highlightResourcesRef.current = null;
          }
          onBirthdayMatchesChange?.([]);
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
  }, [
    scene,
    gl,
    camera,
    raycaster,
    showDebug,
    onLoaded,
    onStarSelected,
    onBirthdayMatchesChange,
  ]);

  useEffect(() => {
    const cleanupHighlight = () => {
      const group = highlightGroupRef.current;
      if (group) {
        scene.remove(group);
        highlightGroupRef.current = null;
      }

      const resources = highlightResourcesRef.current;
      if (resources) {
        for (const geometry of resources.geometries) {
          geometry.dispose();
        }
        for (const material of resources.materials) {
          material.dispose();
        }
        highlightResourcesRef.current = null;
      }
    };

    void starDataVersion;

    if (
      typeof birthdayAgeYears !== "number" ||
      !Number.isFinite(birthdayAgeYears) ||
      !starDataRef.current ||
      starDataRef.current.length === 0
    ) {
      cleanupHighlight();
      onBirthdayMatchesChange?.([]);
      return cleanupHighlight;
    }

    cleanupHighlight();

    const starData = starDataRef.current;
    const tolerance = Math.max(birthdayAgeTolerance ?? 0.75, 0.1);

    const candidates = starData
      .map((star, index) => ({
        star,
        index,
        difference: Math.abs(star.distanceLightYears - birthdayAgeYears),
      }))
      .filter((candidate) => candidate.difference <= tolerance);

    if (candidates.length === 0) {
      onBirthdayMatchesChange?.([]);
      return cleanupHighlight;
    }

    candidates.sort((a, b) => a.difference - b.difference);
    const limited = candidates.slice(0, 200);

    const highlightGroup = new THREE.Group();
    highlightGroup.renderOrder = 200;

    const resources = {
      geometries: [] as THREE.BufferGeometry[],
      materials: [] as THREE.Material[],
    };

    const coreGeometry = new THREE.SphereGeometry(0.55, 24, 24);
    const glowGeometry = new THREE.SphereGeometry(1, 24, 24);
    const homeGeometry = new THREE.SphereGeometry(0.18, 20, 20);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff3b3b"),
      depthWrite: false,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff3b3b"),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#67e8f9"),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const homeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#67e8f9"),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    resources.geometries.push(coreGeometry, glowGeometry, homeGeometry);
    resources.materials.push(
      coreMaterial,
      glowMaterial,
      lineMaterial,
      homeMaterial,
    );

    const matchesForCallback: SelectedStarInfo[] = [];

    for (const candidate of limited) {
      const { star, index } = candidate;
      const position = new THREE.Vector3(star.x, star.y, star.z);

      const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      coreMesh.position.copy(position);
      coreMesh.scale.setScalar(CORE_BASE_SCALE);
      coreMesh.renderOrder = 210;
      highlightGroup.add(coreMesh);

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(position);
      glowMesh.scale.setScalar(GLOW_BASE_SCALE);
      glowMesh.renderOrder = 209;
      highlightGroup.add(glowMesh);

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setFromPoints([new THREE.Vector3(0, 0, 0), position]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 205;
      highlightGroup.add(line);
      resources.geometries.push(lineGeometry);

      matchesForCallback.push({
        index,
        id: star.i,
        name: star.n ?? `Star ${star.i}`,
        position: [star.x, star.y, star.z],
        distanceParsec: star.distanceParsec,
        distanceLightYears: star.distanceLightYears,
        luminosity: star.N ?? 0,
        colorRGB: [
          clampColorComponent(star.K?.r),
          clampColorComponent(star.K?.g),
          clampColorComponent(star.K?.b),
        ],
      });
    }

    const homeOrb = new THREE.Mesh(homeGeometry, homeMaterial);
    homeOrb.position.set(0, 0, 0);
    homeOrb.renderOrder = 215;
    highlightGroup.add(homeOrb);

    scene.add(highlightGroup);

    highlightGroupRef.current = highlightGroup;
    highlightResourcesRef.current = resources;

    onBirthdayMatchesChange?.(matchesForCallback);

    return cleanupHighlight;
  }, [
    birthdayAgeYears,
    birthdayAgeTolerance,
    onBirthdayMatchesChange,
    scene,
    starDataVersion,
  ]);

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
