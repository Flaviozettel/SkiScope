import * as THREE from "three";
import maplibregl from "maplibre-gl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createScratLayer(map, lng, lat) {
    /**
     * =========================
     * MODEL CONFIGURATION
     * =========================
     */
    const modelOrigin = [lng, lat];
    const modelAltitude = 100;

    // Rotation (X, Y, Z)
    const modelRotation = [
        Math.PI / 2, // X-Achse (Kippung für MapLibre-Ausrichtung)
        0,
        0
    ];

    /**
     * Convert geographic coordinates to Mercator space
     */
    const modelMercator = maplibregl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
    );

    return {
        id: "scrat-3d",
        type: "custom",
        renderingMode: "3d",

        /**
         * Called once when layer is added to the map
         */
        onAdd(map, gl) {
            // THREE setup
            this.scene = new THREE.Scene();
            this.camera = new THREE.Camera();

            // -------------------------
            // LIGHTING
            // -------------------------
            const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
            directionalLight.position.set(0, -70, 100).normalize();
            this.scene.add(directionalLight);

            const ambientLight = new THREE.AmbientLight(0xffffff, 1);
            this.scene.add(ambientLight);

            // -------------------------
            // MODEL LOADING
            // -------------------------
            const loader = new GLTFLoader();

            loader.load("/SCRAT.gltf", (gltf) => {
                const model = gltf.scene;

                // Scale model (adjust if needed)
                model.scale.set(300, 300, 300);

                this.scene.add(model);

                console.log("✅ Scrat model loaded");
            });

            // -------------------------
            // RENDERER
            // -------------------------
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true,
            });

            this.renderer.autoClear = false;
        },

        /**
         * Called every frame
         */
        render(gl, args) {
            const projection = args.defaultProjectionData;
            if (!projection) return;

            /**
             * Base projection matrix from MapLibre
             */
            const projectionMatrix = new THREE.Matrix4().fromArray(
                projection.mainMatrix
            );

            /**
             * Position + scale in Mercator space
             */
            const transformMatrix = new THREE.Matrix4()
                .makeTranslation(
                    modelMercator.x,
                    modelMercator.y,
                    modelMercator.z
                )
                .scale(
                    new THREE.Vector3(
                        modelMercator.meterInMercatorCoordinateUnits(),
                        -modelMercator.meterInMercatorCoordinateUnits(),
                        modelMercator.meterInMercatorCoordinateUnits()
                    )
                );

            /**
             * Rotation matrices
             */
            const rotationX = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(1, 0, 0),
                modelRotation[0]
            );

            const rotationY = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 1, 0),
                modelRotation[1]
            );

            const rotationZ = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 0, 1),
                modelRotation[2]
            );

            /**
             * Final model matrix
             */
            const modelMatrix = transformMatrix
                .multiply(rotationX)
                .multiply(rotationY)
                .multiply(rotationZ);

            /**
             * Apply to camera
             */
            this.camera.projectionMatrix = projectionMatrix.multiply(modelMatrix);

            // Render frame
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            // Ensure continuous rendering
            map.triggerRepaint();
        },
    };
}