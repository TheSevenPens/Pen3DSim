// Pen3DSim - 3D Pen Simulation Class
// Encapsulates all scene building and rendering code

class Pen3DSim {
    constructor(viewerElement) {
        this.viewer = viewerElement;
        
        // Initialize state
        this.tiltAltitude = 0;
        this.tiltAzimuth = 0;
        this.barrelRotation = 0;
        this.tabletOffsetX = 8;
        this.tabletOffsetZ = 4.5;
        this.distance = 0;
        this.showAltitudeAnnotations = false;
        this.showBarrelAnnotations = false;
        this.showTiltXAnnotations = false;
        this.showTiltYAnnotations = false;
        this.cursorRotation = 180; // degrees around long axis
        this.cursorTipRotationY = 90; // degrees around Y axis at tip
        
        // Constants
        this.tabletWidth = 16;
        this.tabletDepth = 9;
        this.yOffset = 0.051;
        this.arcRadius = 1.5;
        this.barrelArcRadius = 1.5;
        
        // Initialize scene
        this.initScene();
        this.initCameras();
        this.initRenderer();
        this.initControls();
        this.initLighting();
        this.initTablet();
        this.initPen();
        this.initAnnotations();
        this.initAxisMarkers();
        
        // Start animation loop
        this.animate();
        
        // Initialize pen position
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
    }
    
    initCameras() {
        const cameraAspectRatio = this.viewer.clientWidth / this.viewer.clientHeight;
        const cameraNear = 0.1;
        const cameraFar = 1000;
        
        this.perspectiveCamera = new THREE.PerspectiveCamera(30, cameraAspectRatio, cameraNear, cameraFar);
        this.perspectiveCamera.position.set(0, 15, 25);
        this.perspectiveCamera.lookAt(0, 0, 0);
        
        const orthoSize = 20;
        this.orthographicCamera = new THREE.OrthographicCamera(
            -orthoSize * cameraAspectRatio,
            orthoSize * cameraAspectRatio,
            orthoSize,
            -orthoSize,
            cameraNear,
            cameraFar
        );
        this.orthographicCamera.position.set(0, 15, 25);
        this.orthographicCamera.lookAt(0, 0, 0);
        
        this.camera = this.perspectiveCamera;
        this.orthoSize = orthoSize;
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.viewer.appendChild(this.renderer.domElement);
    }
    
    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
    }
    
    initLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 20, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-10, 10, -10);
        this.scene.add(pointLight);
    }
    
    initTablet() {
        const geometry = new THREE.BoxGeometry(16, 0.1, 9);
        const material = new THREE.MeshStandardMaterial({
            color: 0x505050,
            roughness: 0.7,
            metalness: 0.2
        });
        const tablet = new THREE.Mesh(geometry, material);
        tablet.castShadow = true;
        tablet.receiveShadow = true;
        this.scene.add(tablet);
        
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x808080, linewidth: 1 })
        );
        tablet.add(wireframe);
        
        const gridGroup = new THREE.Group();
        const gridMaterial = new THREE.LineBasicMaterial({ color: 0x5a5a5a, linewidth: 1 });
        const gridSpacing = 0.5;
        
        for (let x = -this.tabletWidth / 2; x <= this.tabletWidth / 2; x += gridSpacing) {
            const points = [];
            points.push(new THREE.Vector3(x, this.yOffset, -this.tabletDepth / 2));
            points.push(new THREE.Vector3(x, this.yOffset, this.tabletDepth / 2));
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeometry, gridMaterial);
            gridGroup.add(line);
        }
        
        for (let z = -this.tabletDepth / 2; z <= this.tabletDepth / 2; z += gridSpacing) {
            const points = [];
            points.push(new THREE.Vector3(-this.tabletWidth / 2, this.yOffset, z));
            points.push(new THREE.Vector3(this.tabletWidth / 2, this.yOffset, z));
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeometry, gridMaterial);
            gridGroup.add(line);
        }
        
        this.scene.add(gridGroup);
        
        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        gridHelper.position.y = -5;
        this.scene.add(gridHelper);
    }
    
    createCheckerboardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        const checkSize = 256;
        const checksX = canvas.width / checkSize;
        const checksY = canvas.height / checkSize;
        
        const checkColor1 = '#ee66dd';
        const checkColor2 = '#aa33bb';
        for (let y = 0; y < checksY; y++) {
            for (let x = 0; x < checksX; x++) {
                const isEven = (x + y) % 2 === 0;
                context.fillStyle = isEven ? checkColor1 : checkColor2;
                context.fillRect(x * checkSize, y * checkSize, checkSize, checkSize);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }
    
    initPen() {
        this.penGroup = new THREE.Group();
        
        const checkerboardTexture = this.createCheckerboardTexture();
        checkerboardTexture.wrapS = THREE.RepeatWrapping;
        checkerboardTexture.wrapT = THREE.RepeatWrapping;
        
        const tipHeight = 0.5;
        const tipGeometry = new THREE.ConeGeometry(0.1, tipHeight, 16);
        const tipTexture = checkerboardTexture.clone();
        tipTexture.needsUpdate = true;
        tipTexture.repeat.set(2, 1);
        
        const tipMaterial = new THREE.MeshStandardMaterial({
            map: tipTexture,
            roughness: 0.8,
            metalness: 0.1
        });
        const penTip = new THREE.Mesh(tipGeometry, tipMaterial);
        penTip.castShadow = true;
        penTip.rotation.x = Math.PI;
        penTip.position.y = -tipHeight / 2;
        this.penGroup.add(penTip);
        
        const barrelHeight = 4;
        const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, barrelHeight, 16);
        const barrelTexture = checkerboardTexture.clone();
        barrelTexture.needsUpdate = true;
        barrelTexture.repeat.set(2, 2);
        
        const barrelMaterial = new THREE.MeshStandardMaterial({
            map: barrelTexture,
            roughness: 0.8,
            metalness: 0.1
        });
        const penBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        penBarrel.castShadow = true;
        penBarrel.position.y = barrelHeight / 2;
        this.penGroup.add(penBarrel);
        
        this.penGroup.position.set(0, 0, 0);
        this.scene.add(this.penGroup);
        
        // Line from top of pen to tablet surface
        this.penLinePositions = new Float32Array(6);
        this.penLineGeometry = new THREE.BufferGeometry();
        this.penLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penLinePositions, 3));
        
        const penLineMaterial = new THREE.LineDashedMaterial({
            color: 0xffff00,
            dashSize: 0.08,
            gapSize: 0.05
        });
        this.penLine = new THREE.Line(this.penLineGeometry, penLineMaterial);
        this.scene.add(this.penLine);
        
        // Line from pen tip to tablet surface
        this.penTipLinePositions = new Float32Array(6);
        this.penTipLineGeometry = new THREE.BufferGeometry();
        this.penTipLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penTipLinePositions, 3));
        
        const penTipLineMaterial = new THREE.LineDashedMaterial({
            color: 0xffff00,
            dashSize: 0.08,
            gapSize: 0.05
        });
        this.penTipLine = new THREE.Line(this.penTipLineGeometry, penTipLineMaterial);
        this.scene.add(this.penTipLine);
        
        // White dotted line along pen's long axis from tip to tablet surface
        this.penAxisLinePositions = new Float32Array(6);
        this.penAxisLineGeometry = new THREE.BufferGeometry();
        this.penAxisLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penAxisLinePositions, 3));
        
        const penAxisLineMaterial = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 0.08,
            gapSize: 0.05
        });
        this.penAxisLine = new THREE.Line(this.penAxisLineGeometry, penAxisLineMaterial);
        this.scene.add(this.penAxisLine);
        
        // Windows mouse cursor arrow on tablet surface
        this.cursorArrow = this.createCursorArrow();
        this.scene.add(this.cursorArrow);
        
        // Local positions
        this.penTopLocal = new THREE.Vector3(0, 4, 0);
        this.penTopWorld = new THREE.Vector3();
        this.penLineBottom = new THREE.Vector3();
        this.penTipLocal = new THREE.Vector3(0, -0.5, 0);
        this.penTipWorld = new THREE.Vector3();
        this.penTipLineBottom = new THREE.Vector3();
        this.penAxisIntersection = new THREE.Vector3();
    }
    
    createCursorArrow() {
        // Create Windows mouse cursor arrow shape
        // The arrow points up-left (northwest direction)
        // Tip is at origin (0, 0) so it aligns with intersection point
        const cursorSize = 0.6; // inches (2x bigger)
        const shape = new THREE.Shape();
        
        // Arrow tip at origin (0, 0) pointing up-left
        // The tip is at the top-left of the arrow
        const tipX = 0;
        const tipZ = 0;
        
        // Arrow shape: tip at origin, body extends down-right
        shape.moveTo(tipX, tipZ); // Tip (top-left)
        shape.lineTo(tipX - cursorSize * 0.2, tipZ + cursorSize * 0.3); // Left edge
        shape.lineTo(tipX - cursorSize * 0.1, tipZ + cursorSize * 0.3); // Left body
        shape.lineTo(tipX - cursorSize * 0.1, tipZ + cursorSize * 0.6); // Bottom-left
        shape.lineTo(tipX + cursorSize * 0.1, tipZ + cursorSize * 0.6); // Bottom-right
        shape.lineTo(tipX + cursorSize * 0.1, tipZ + cursorSize * 0.3); // Right body
        shape.lineTo(tipX + cursorSize * 0.2, tipZ + cursorSize * 0.3); // Right edge
        shape.lineTo(tipX, tipZ); // Back to tip
        
        const geometry = new THREE.ShapeGeometry(shape);
        
        // White fill with black outline
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Calculate mouse cursor rotation using quaternions
        // The cursor should:
        // 1. Be flat on XZ plane (tablet surface)
        // 2. Point northwest (up-left direction)
        // 3. Be rotated 45 degrees around its long axis
        
        // Step 1: Rotate from XY plane to XZ plane (flat on tablet)
        // Rotate -90 degrees around X axis
        const toXZPlaneQuat = new THREE.Quaternion();
        toXZPlaneQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        
        // Step 2: Rotate to point northwest (up-left)
        // In XZ plane, northwest = -X direction + Z direction
        // Rotate -45 degrees around Y axis, plus additional Y rotation from slider
        const baseYRotation = -Math.PI / 4; // Base northwest direction
        // cursorTipRotationY is already initialized to 90 in constructor
        const pointNorthwestQuat = new THREE.Quaternion();
        pointNorthwestQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), baseYRotation);
        
        // Step 3: Rotate 45 degrees around the arrow's long axis (local X axis after above rotations)
        // The long axis is the direction the arrow points (northwest direction in XZ plane)
        // After the above rotations, local X axis points northwest in the XZ plane
        // To rotate around this axis while keeping it flat, we need to:
        // 1. Apply base rotations first
        // 2. Get the transformed local X axis (which is the long axis in world space)
        // 3. Rotate around that axis
        
        // Apply base rotations first
        const baseQuat = new THREE.Quaternion();
        baseQuat.multiplyQuaternions(pointNorthwestQuat, toXZPlaneQuat);
        
        // Get the transformed local X axis (the long axis direction in world space)
        // Local X axis (1, 0, 0) transformed by baseQuat gives us the long axis direction
        const localXAxis = new THREE.Vector3(1, 0, 0);
        const longAxisDir = localXAxis.applyQuaternion(baseQuat).normalize();
        
        // Store base quaternion and long axis direction for later updates
        this.cursorBaseQuat = baseQuat.clone();
        this.cursorLongAxisDir = longAxisDir.clone();
        
        // Store reference to mesh for rotation updates
        this.cursorArrowMesh = mesh;
        
        // Apply initial rotation
        this.updateCursorRotation();
        
        // Position will be updated in updatePenTransform
        // Y position is set to yOffset to be exactly on tablet surface
        mesh.position.set(0, this.yOffset, 0);
        
        // Add black outline
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(wireframe);
        
        return mesh;
    }
    
    initAnnotations() {
        // Arc annotation group (azimuth)
        this.arcAnnotationGroup = new THREE.Group();
        const arcMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const arcThickness = 0.02;
        
        const arcGeometry = new THREE.BufferGeometry();
        this.arcLine = new THREE.Mesh(arcGeometry, arcMaterial);
        this.arcAnnotationGroup.add(this.arcLine);
        
        const arrowMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        const arrowGeometry = new THREE.BufferGeometry();
        const arrowLine = new THREE.Line(arrowGeometry, arrowMaterial);
        arrowLine.visible = false;
        this.arcAnnotationGroup.add(arrowLine);
        
        const dottedArcMaterial = new THREE.LineDashedMaterial({ 
            color: 0x00ff00, 
            dashSize: 0.08, 
            gapSize: 0.05,
            linewidth: 2 
        });
        const dottedArcGeometry = new THREE.BufferGeometry();
        this.dottedArcLine = new THREE.Line(dottedArcGeometry, dottedArcMaterial);
        this.arcAnnotationGroup.add(this.dottedArcLine);
        
        this.arcPieMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.arcPieMesh = null;
        
        this.scene.add(this.arcAnnotationGroup);
        
        // Surface line
        this.surfaceLineGeometry = new THREE.BufferGeometry();
        const surfaceLineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        this.surfaceLine = new THREE.Line(this.surfaceLineGeometry, surfaceLineMaterial);
        this.scene.add(this.surfaceLine);
        
        const surfaceArrowGeometry = new THREE.BufferGeometry();
        const surfaceArrowLine = new THREE.Line(surfaceArrowGeometry, surfaceLineMaterial);
        surfaceArrowLine.visible = false;
        this.scene.add(surfaceArrowLine);
        
        // Barrel rotation annotations
        this.barrelAnnotationGroup = new THREE.Group();
        const barrelArcThickness = 0.02;
        const barrelAnnotationMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });
        const barrelArrowMaterial = new THREE.LineBasicMaterial({ color: 0xff8800, linewidth: 2 });
        
        const barrelArcGeometry = new THREE.BufferGeometry();
        this.barrelArcLine = new THREE.Mesh(barrelArcGeometry, barrelAnnotationMaterial);
        this.barrelAnnotationGroup.add(this.barrelArcLine);
        
        const barrelArrowGeometry = new THREE.BufferGeometry();
        const barrelArrowLine = new THREE.Line(barrelArrowGeometry, barrelArrowMaterial);
        barrelArrowLine.visible = false;
        this.barrelAnnotationGroup.add(barrelArrowLine);
        
        const barrelSurfaceLineGeometry = new THREE.BufferGeometry();
        this.barrelSurfaceLine = new THREE.Line(barrelSurfaceLineGeometry, barrelArrowMaterial);
        this.barrelAnnotationGroup.add(this.barrelSurfaceLine);
        
        const barrelSurfaceArrowGeometry = new THREE.BufferGeometry();
        const barrelSurfaceArrowLine = new THREE.Line(barrelSurfaceArrowGeometry, barrelArrowMaterial);
        barrelSurfaceArrowLine.visible = false;
        this.barrelAnnotationGroup.add(barrelSurfaceArrowLine);
        
        const barrelDottedCircleMaterial = new THREE.LineDashedMaterial({ 
            color: 0xff8800, 
            dashSize: 0.08, 
            gapSize: 0.05,
            linewidth: 2 
        });
        const barrelDottedCircleGeometry = new THREE.BufferGeometry();
        this.barrelDottedCircleLine = new THREE.Line(barrelDottedCircleGeometry, barrelDottedCircleMaterial);
        this.barrelAnnotationGroup.add(this.barrelDottedCircleLine);
        
        this.barrelPieMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.barrelPieMesh = null;
        
        this.scene.add(this.barrelAnnotationGroup);
        
        // Fuscia arc (tilt altitude)
        const fusciaArcThickness = 0.02;
        const fusciaArcMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const fusciaArcGeometry = new THREE.BufferGeometry();
        this.fusciaArcLine = new THREE.Mesh(fusciaArcGeometry, fusciaArcMaterial);
        this.scene.add(this.fusciaArcLine);
        
        this.fusciaPieMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.fusciaPieMesh = null;
        
        const fusciaVerticalLineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
        const fusciaVerticalLineGeometry = new THREE.BufferGeometry();
        this.fusciaVerticalLine = new THREE.Line(fusciaVerticalLineGeometry, fusciaVerticalLineMaterial);
        this.scene.add(this.fusciaVerticalLine);
        
        const fusciaSemicircleMaterial = new THREE.LineDashedMaterial({ 
            color: 0xff00ff, 
            dashSize: 0.08, 
            gapSize: 0.05,
            linewidth: 2 
        });
        const fusciaSemicircleGeometry = new THREE.BufferGeometry();
        this.fusciaSemicircleLine = new THREE.Line(fusciaSemicircleGeometry, fusciaSemicircleMaterial);
        this.scene.add(this.fusciaSemicircleLine);
        
        // Tilt X annotation
        const tiltXArcThickness = 0.02;
        const tiltXArcMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff });
        const tiltXArcGeometry = new THREE.BufferGeometry();
        this.tiltXArcLine = new THREE.Mesh(tiltXArcGeometry, tiltXArcMaterial);
        this.scene.add(this.tiltXArcLine);
        
        this.tiltXPieMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x88ccff, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.tiltXPieMesh = null;
        
        const tiltXVerticalLineMaterial = new THREE.LineBasicMaterial({ color: 0x88ccff, linewidth: 2 });
        const tiltXVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltXVerticalLine = new THREE.Line(tiltXVerticalLineGeometry, tiltXVerticalLineMaterial);
        this.scene.add(this.tiltXVerticalLine);
        
        const tiltXDottedCircleMaterial = new THREE.LineDashedMaterial({ 
            color: 0x88ccff, 
            dashSize: 0.08, 
            gapSize: 0.05,
            linewidth: 2 
        });
        const tiltXDottedCircleGeometry = new THREE.BufferGeometry();
        this.tiltXDottedCircleLine = new THREE.Line(tiltXDottedCircleGeometry, tiltXDottedCircleMaterial);
        this.scene.add(this.tiltXDottedCircleLine);
        
        // Tilt Y annotation
        const tiltYArcThickness = 0.02;
        const tiltYArcMaterial = new THREE.MeshBasicMaterial({ color: 0xff88cc });
        const tiltYArcGeometry = new THREE.BufferGeometry();
        this.tiltYArcLine = new THREE.Mesh(tiltYArcGeometry, tiltYArcMaterial);
        this.scene.add(this.tiltYArcLine);
        
        this.tiltYPieMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff88cc, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.tiltYPieMesh = null;
        
        const tiltYVerticalLineMaterial = new THREE.LineBasicMaterial({ color: 0xff88cc, linewidth: 2 });
        const tiltYVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltYVerticalLine = new THREE.Line(tiltYVerticalLineGeometry, tiltYVerticalLineMaterial);
        this.scene.add(this.tiltYVerticalLine);
        
        const tiltYDottedCircleMaterial = new THREE.LineDashedMaterial({ 
            color: 0xff88cc, 
            dashSize: 0.08, 
            gapSize: 0.05,
            linewidth: 2 
        });
        const tiltYDottedCircleGeometry = new THREE.BufferGeometry();
        this.tiltYDottedCircleLine = new THREE.Line(tiltYDottedCircleGeometry, tiltYDottedCircleMaterial);
        this.scene.add(this.tiltYDottedCircleLine);
    }
    
    initAxisMarkers() {
        const createTextLabel = (text, color, position) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            
            context.fillStyle = color;
            context.font = 'Bold 16px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(2, 2, 1);
            
            return sprite;
        };
        
        const xLabelUser = 'X';
        const yLabelUser = 'Z';
        const zLabelUser = 'Y';
        
        const tabletTopY = 0.05;
        const arrowOffset = 0.5;
        const arrowPos = new THREE.Vector3(
            -this.tabletWidth / 2 - arrowOffset,
            tabletTopY,
            -this.tabletDepth / 2 - arrowOffset
        );
        
        const xLabelDistance = 3;
        const yLabelDistance = 3;
        const zLabelDistance = 3;
        
        const xAxisColor = '#cc0055';
        const yAxisColor = '#00cc66';
        const zAxisColor = '#0055cc';
        
        this.xLabel = createTextLabel(xLabelUser, xAxisColor, arrowPos.clone().add(new THREE.Vector3(xLabelDistance, 0, 0)));
        this.yLabel = createTextLabel(yLabelUser, yAxisColor, arrowPos.clone().add(new THREE.Vector3(0, yLabelDistance, 0)));
        this.zLabel = createTextLabel(zLabelUser, zAxisColor, arrowPos.clone().add(new THREE.Vector3(0, 0, zLabelDistance)));
        
        this.scene.add(this.xLabel);
        this.scene.add(this.yLabel);
        this.scene.add(this.zLabel);
        
        const arrowGap = 0.5;
        this.xArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            arrowPos,
            xLabelDistance - arrowGap,
            xAxisColor
        );
        
        this.yArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            arrowPos,
            yLabelDistance - arrowGap,
            yAxisColor
        );
        
        this.zArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            arrowPos,
            zLabelDistance - arrowGap,
            zAxisColor
        );
        
        this.scene.add(this.xArrow);
        this.scene.add(this.yArrow);
        this.scene.add(this.zArrow);
    }
    
    // Helper functions
    createCurveFromPoints(points) {
        return new THREE.CatmullRomCurve3(points);
    }
    
    createCircularArcInPlane(center, u, v, radius, startAngle, endAngle, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const point = center.clone().add(
                u.clone().multiplyScalar(radius * cosA)
            ).add(
                v.clone().multiplyScalar(radius * sinA)
            );
            points.push(point);
        }
        return points;
    }
    
    createBarrelArcPoints(center, axis, u, v, radius, startAngle, endAngle, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const point = center.clone().add(
                u.clone().multiplyScalar(radius * cosA)
            ).add(
                v.clone().multiplyScalar(radius * sinA)
            );
            points.push(point);
        }
        return points;
    }
    
    createSurfaceArrow(startX, startZ, endX, endZ) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        
        const dx = endX - startX;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx * dx + dz * dz);
        
        if (length < 0.001) {
            return [];
        }
        
        const dirX = dx / length;
        const dirZ = dz / length;
        const perpX = -dirZ;
        const perpZ = dirX;
        
        return [
            new THREE.Vector3(endX, this.yOffset, endZ),
            new THREE.Vector3(
                endX - arrowHeadLength * dirX - arrowWidth * perpX,
                this.yOffset,
                endZ - arrowHeadLength * dirZ - arrowWidth * perpZ
            ),
            new THREE.Vector3(
                endX - arrowHeadLength * dirX + arrowWidth * perpX,
                this.yOffset,
                endZ - arrowHeadLength * dirZ + arrowWidth * perpZ
            ),
            new THREE.Vector3(endX, this.yOffset, endZ)
        ];
    }
    
    createBarrelArrow(center, axis, u, v, radius, angle) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const endPoint = center.clone().add(
            u.clone().multiplyScalar(radius * cosA)
        ).add(
            v.clone().multiplyScalar(radius * sinA)
        );
        
        const tangent = u.clone().multiplyScalar(sinA).add(v.clone().multiplyScalar(-cosA));
        tangent.normalize();
        
        const perp = u.clone().multiplyScalar(cosA).add(v.clone().multiplyScalar(sinA));
        perp.normalize();
        
        return [
            endPoint.clone(),
            endPoint.clone().add(tangent.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(-arrowWidth)),
            endPoint.clone().add(tangent.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(arrowWidth)),
            endPoint.clone()
        ];
    }
    
    createBarrelSurfaceArrow(center, direction, axis) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        
        const length = direction.length();
        if (length < 0.001) {
            return [];
        }
        
        const endPoint = center.clone().add(direction);
        const dir = direction.clone().normalize();
        const perp = new THREE.Vector3().crossVectors(dir, axis).normalize();
        
        return [
            endPoint.clone(),
            endPoint.clone().add(dir.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(-arrowWidth)),
            endPoint.clone().add(dir.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(arrowWidth)),
            endPoint.clone()
        ];
    }
    
    createArrow(centerX, centerZ, radius, angle) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        
        const endX = centerX + radius * Math.cos(angle);
        const endZ = centerZ + radius * Math.sin(angle);
        
        const dirX = Math.sin(angle);
        const dirZ = -Math.cos(angle);
        const perpX = Math.cos(angle);
        const perpZ = Math.sin(angle);
        
        return [
            new THREE.Vector3(endX, this.yOffset, endZ),
            new THREE.Vector3(
                endX - arrowHeadLength * dirX - arrowWidth * perpX,
                this.yOffset,
                endZ - arrowHeadLength * dirZ - arrowWidth * perpZ
            ),
            new THREE.Vector3(
                endX - arrowHeadLength * dirX + arrowWidth * perpX,
                this.yOffset,
                endZ - arrowHeadLength * dirZ + arrowWidth * perpZ
            ),
            new THREE.Vector3(endX, this.yOffset, endZ)
        ];
    }
    
    createPieShapeInPlane(center, u, v, radius, startAngle, endAngle, segments = 32) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const x = radius * cosA;
            const y = radius * sinA;
            shape.lineTo(x, y);
        }
        shape.lineTo(0, 0);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry);
        mesh.position.copy(center);
        
        const uNorm = u.clone().normalize();
        const vNorm = v.clone().normalize();
        const normal = new THREE.Vector3().crossVectors(uNorm, vNorm).normalize();
        
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeBasis(uNorm, vNorm, normal);
        rotationMatrix.transpose();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromRotationMatrix(rotationMatrix);
        mesh.setRotationFromQuaternion(quaternion);
        
        return mesh;
    }
    
    calculateTiltX(altitude, azimuth) {
        const altRad = (altitude * Math.PI) / 180;
        const azRad = (azimuth * Math.PI) / 180;
        const tiltXRad = Math.atan(Math.tan(altRad) * Math.sin(azRad));
        return (tiltXRad * 180) / Math.PI;
    }
    
    calculateTiltY(altitude, azimuth) {
        const altRad = (altitude * Math.PI) / 180;
        const azRad = (azimuth * Math.PI) / 180;
        const tiltYRad = Math.atan(Math.tan(altRad) * Math.cos(azRad));
        return (tiltYRad * 180) / Math.PI;
    }
    
    // Main update function - this is the core of the simulation
    updatePenTransform(distance, altitude, azimuth, barrel) {
        const tabletTopY = 0.05;
        const tipLength = 0.5;
        
        const altitudeRad = (altitude * Math.PI) / 180;
        const azimuthRad = (azimuth * Math.PI) / 180;
        const barrelRad = (barrel * Math.PI) / 180;
        
        const tipContactX = THREE.MathUtils.clamp(this.tabletOffsetX - this.tabletWidth / 2, -this.tabletWidth / 2, this.tabletWidth / 2);
        const tipContactY = tabletTopY + distance;
        const tipContactZ = THREE.MathUtils.clamp(this.tabletOffsetZ - this.tabletDepth / 2, -this.tabletDepth / 2, this.tabletDepth / 2);
        
        const azimuthQuat = new THREE.Quaternion();
        azimuthQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), azimuthRad);
        
        const altitudeQuat = new THREE.Quaternion();
        altitudeQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), altitudeRad);
        
        const barrelQuat = new THREE.Quaternion();
        barrelQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), barrelRad);
        
        const quaternion = new THREE.Quaternion();
        quaternion.multiplyQuaternions(altitudeQuat, barrelQuat);
        quaternion.premultiply(azimuthQuat);
        
        this.penGroup.setRotationFromQuaternion(quaternion);
        
        const tipOffsetLocal = new THREE.Vector3(0, -tipLength, 0);
        const tipOffsetWorld = tipOffsetLocal.clone().applyQuaternion(quaternion);
        
        this.penGroup.position.set(
            tipContactX - tipOffsetWorld.x,
            tipContactY - tipOffsetWorld.y,
            tipContactZ - tipOffsetWorld.z
        );
        this.penGroup.updateMatrixWorld(true);
        
        this.penTopWorld.copy(this.penTopLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penLineBottom.set(this.penTopWorld.x, tabletTopY, this.penTopWorld.z);
        
        this.penLinePositions[0] = this.penTopWorld.x;
        this.penLinePositions[1] = this.penTopWorld.y;
        this.penLinePositions[2] = this.penTopWorld.z;
        this.penLinePositions[3] = this.penLineBottom.x;
        this.penLinePositions[4] = this.penLineBottom.y;
        this.penLinePositions[5] = this.penLineBottom.z;
        
        this.penLine.visible = (altitude !== 0);
        
        this.penTipWorld.copy(this.penTipLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTipLineBottom.set(this.penTipWorld.x, tabletTopY, this.penTipWorld.z);
        
        // Calculate intersection of pen's long axis with tablet surface
        // Pen's long axis is the Y axis in pen's local space (0, 1, 0) transformed to world space
        const penAxisDir = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
        
        // Find where the ray from pen tip along pen axis intersects the tablet surface (y = tabletTopY)
        // Ray equation: penTipWorld + t * penAxisDir
        // We want: penTipWorld.y + t * penAxisDir.y = tabletTopY
        // So: t = (tabletTopY - penTipWorld.y) / penAxisDir.y
        const penAxisDirY = penAxisDir.y;
        if (Math.abs(penAxisDirY) > 0.001) {
            // Pen axis is not horizontal, so it will intersect the tablet surface
            const t = (tabletTopY - this.penTipWorld.y) / penAxisDirY;
            this.penAxisIntersection.copy(this.penTipWorld).add(penAxisDir.clone().multiplyScalar(t));
        } else {
            // Pen is horizontal, extend the line a long distance in the pen axis direction
            const extendDistance = 20; // inches
            this.penAxisIntersection.copy(this.penTipWorld).add(penAxisDir.clone().multiplyScalar(extendDistance));
            // Project to tablet surface
            this.penAxisIntersection.y = tabletTopY;
        }
        
        // Update white dotted line along pen axis
        this.penAxisLinePositions[0] = this.penTipWorld.x;
        this.penAxisLinePositions[1] = this.penTipWorld.y;
        this.penAxisLinePositions[2] = this.penTipWorld.z;
        this.penAxisLinePositions[3] = this.penAxisIntersection.x;
        this.penAxisLinePositions[4] = this.penAxisIntersection.y;
        this.penAxisLinePositions[5] = this.penAxisIntersection.z;
        
        this.penAxisLineGeometry.attributes.position.needsUpdate = true;
        this.penAxisLine.computeLineDistances();
        
        // Update cursor arrow position to point directly below pen tip
        this.cursorArrow.position.set(
            this.penTipLineBottom.x,
            this.yOffset,
            this.penTipLineBottom.z
        );
        
        // Update fuscia arc (tilt altitude)
        const arcCenter = this.penTipWorld.clone();
        const arcRadius = 2.0;
        
        const verticalDir = new THREE.Vector3(0, 1, 0);
        // Reuse penAxisDir calculated above
        
        const fusciaU = verticalDir.clone().normalize();
        const penAxisProjected = penAxisDir.clone().sub(fusciaU.clone().multiplyScalar(penAxisDir.dot(fusciaU)));
        const fusciaV = penAxisProjected.length() > 0.001 ? penAxisProjected.normalize() : new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
        
        const fusciaStartAngle = 0;
        const fusciaEndAngle = Math.atan2(penAxisDir.dot(fusciaV), penAxisDir.dot(fusciaU));
        
        if (altitude !== 0 && this.showAltitudeAnnotations) {
            const arcStartPoint = arcCenter.clone().add(fusciaU.clone().multiplyScalar(arcRadius));
            const fusciaVerticalLinePoints = [
                this.penTipWorld.clone(),
                arcStartPoint
            ];
            this.fusciaVerticalLine.geometry.setFromPoints(fusciaVerticalLinePoints);
            this.fusciaVerticalLine.geometry.attributes.position.needsUpdate = true;
            this.fusciaVerticalLine.visible = true;
            
            const fusciaArcPoints = this.createCircularArcInPlane(arcCenter, fusciaU, fusciaV, arcRadius, fusciaStartAngle, fusciaEndAngle, 32);
            const fusciaArcCurve = this.createCurveFromPoints(fusciaArcPoints);
            const fusciaTubeGeometry = new THREE.TubeGeometry(fusciaArcCurve, 32, 0.02, 8, false);
            if (this.fusciaArcLine.geometry) {
                this.fusciaArcLine.geometry.dispose();
            }
            this.fusciaArcLine.geometry = fusciaTubeGeometry;
            this.fusciaArcLine.visible = true;
            
            if (this.fusciaPieMesh) {
                this.scene.remove(this.fusciaPieMesh);
                if (this.fusciaPieMesh.geometry) this.fusciaPieMesh.geometry.dispose();
            }
            const fusciaPieShape = new THREE.Shape();
            fusciaPieShape.moveTo(0, 0);
            const fusciaPieSegments = 32;
            for (let i = 0; i <= fusciaPieSegments; i++) {
                const angle = fusciaStartAngle + (fusciaEndAngle - fusciaStartAngle) * (i / fusciaPieSegments);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                fusciaPieShape.lineTo(arcRadius * cosA, arcRadius * sinA);
            }
            fusciaPieShape.lineTo(0, 0);
            const fusciaPieGeometry = new THREE.ShapeGeometry(fusciaPieShape);
            this.fusciaPieMesh = new THREE.Mesh(fusciaPieGeometry, this.fusciaPieMaterial);
            this.fusciaPieMesh.position.copy(arcCenter);
            
            const fusciaUNorm = fusciaU.clone().normalize();
            const fusciaVNorm = fusciaV.clone().normalize();
            const fusciaNormal = new THREE.Vector3().crossVectors(fusciaUNorm, fusciaVNorm).normalize();
            
            const xAxis = new THREE.Vector3(1, 0, 0);
            const zAxis = new THREE.Vector3(0, 0, 1);
            
            const zToNormalQuat = new THREE.Quaternion();
            zToNormalQuat.setFromUnitVectors(zAxis, fusciaNormal);
            
            const xAfterZRot = xAxis.clone().applyQuaternion(zToNormalQuat);
            const xInPlane = xAfterZRot.clone().sub(fusciaNormal.clone().multiplyScalar(xAfterZRot.dot(fusciaNormal))).normalize();
            const angleToU = Math.acos(Math.max(-1, Math.min(1, xInPlane.dot(fusciaUNorm))));
            const cross = new THREE.Vector3().crossVectors(xInPlane, fusciaUNorm);
            const sign = cross.dot(fusciaNormal) >= 0 ? 1 : -1;
            const alignQuat = new THREE.Quaternion().setFromAxisAngle(fusciaNormal, sign * angleToU);
            
            const fusciaPieRotationQuat = new THREE.Quaternion();
            fusciaPieRotationQuat.multiplyQuaternions(alignQuat, zToNormalQuat);
            this.fusciaPieMesh.setRotationFromQuaternion(fusciaPieRotationQuat);
            this.scene.add(this.fusciaPieMesh);
            
            const fusciaCircleSegments = 64;
            const fusciaCirclePoints = this.createCircularArcInPlane(arcCenter, fusciaU, fusciaV, arcRadius, 0, 2 * Math.PI, fusciaCircleSegments);
            this.fusciaSemicircleLine.geometry.setFromPoints(fusciaCirclePoints);
            this.fusciaSemicircleLine.geometry.attributes.position.needsUpdate = true;
            this.fusciaSemicircleLine.computeLineDistances();
            this.fusciaSemicircleLine.visible = true;
        } else {
            this.fusciaVerticalLine.visible = false;
            this.fusciaArcLine.visible = false;
            this.fusciaSemicircleLine.visible = false;
            if (this.fusciaPieMesh) {
                this.scene.remove(this.fusciaPieMesh);
                if (this.fusciaPieMesh.geometry) this.fusciaPieMesh.geometry.dispose();
                this.fusciaPieMesh = null;
            }
        }
        
        const tiltX = this.calculateTiltX(altitude, azimuth);
        const tiltY = this.calculateTiltY(altitude, azimuth);
        
        // Update tilt X annotation
        if (tiltX !== 0 && this.showTiltXAnnotations) {
            const tiltXArcCenter = this.penTipWorld.clone();
            const tiltXArcRadius = 2.0;
            const tiltXU = new THREE.Vector3(0, 1, 0);
            const tiltXV = new THREE.Vector3(1, 0, 0);
            
            const tiltXStartAngle = 0;
            const tiltXEndAngle = (tiltX * Math.PI) / 180;
            
            const tiltXArcStartPoint = tiltXArcCenter.clone().add(tiltXU.clone().multiplyScalar(tiltXArcRadius));
            const tiltXVerticalLinePoints = [
                this.penTipWorld.clone(),
                tiltXArcStartPoint
            ];
            this.tiltXVerticalLine.geometry.setFromPoints(tiltXVerticalLinePoints);
            this.tiltXVerticalLine.geometry.attributes.position.needsUpdate = true;
            this.tiltXVerticalLine.visible = true;
            
            const tiltXArcPoints = this.createCircularArcInPlane(tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, tiltXStartAngle, tiltXEndAngle, 32);
            const tiltXArcCurve = this.createCurveFromPoints(tiltXArcPoints);
            const tiltXTubeGeometry = new THREE.TubeGeometry(tiltXArcCurve, 32, 0.02, 8, false);
            if (this.tiltXArcLine.geometry) {
                this.tiltXArcLine.geometry.dispose();
            }
            this.tiltXArcLine.geometry = tiltXTubeGeometry;
            this.tiltXArcLine.visible = true;
            
            if (this.tiltXPieMesh) {
                this.scene.remove(this.tiltXPieMesh);
                if (this.tiltXPieMesh.geometry) this.tiltXPieMesh.geometry.dispose();
            }
            this.tiltXPieMesh = this.createPieShapeInPlane(tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, tiltXStartAngle, tiltXEndAngle, 32);
            this.tiltXPieMesh.material = this.tiltXPieMaterial;
            this.scene.add(this.tiltXPieMesh);
            
            const tiltXCirclePoints = this.createCircularArcInPlane(tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, 0, 2 * Math.PI, 64);
            this.tiltXDottedCircleLine.geometry.setFromPoints(tiltXCirclePoints);
            this.tiltXDottedCircleLine.geometry.attributes.position.needsUpdate = true;
            this.tiltXDottedCircleLine.computeLineDistances();
            this.tiltXDottedCircleLine.visible = true;
        } else {
            this.tiltXVerticalLine.visible = false;
            this.tiltXArcLine.visible = false;
            this.tiltXDottedCircleLine.visible = false;
            if (this.tiltXPieMesh) {
                this.scene.remove(this.tiltXPieMesh);
                if (this.tiltXPieMesh.geometry) this.tiltXPieMesh.geometry.dispose();
                this.tiltXPieMesh = null;
            }
        }
        
        // Update tilt Y annotation
        if (tiltY !== 0 && this.showTiltYAnnotations) {
            const tiltYArcCenter = this.penTipWorld.clone();
            const tiltYArcRadius = 2.0;
            const tiltYU = new THREE.Vector3(0, 1, 0);
            const tiltYV = new THREE.Vector3(0, 0, 1);
            
            const tiltYStartAngle = 0;
            const tiltYEndAngle = (tiltY * Math.PI) / 180;
            
            const tiltYArcStartPoint = tiltYArcCenter.clone().add(tiltYU.clone().multiplyScalar(tiltYArcRadius));
            const tiltYVerticalLinePoints = [
                this.penTipWorld.clone(),
                tiltYArcStartPoint
            ];
            this.tiltYVerticalLine.geometry.setFromPoints(tiltYVerticalLinePoints);
            this.tiltYVerticalLine.geometry.attributes.position.needsUpdate = true;
            this.tiltYVerticalLine.visible = true;
            
            const tiltYArcPoints = this.createCircularArcInPlane(tiltYArcCenter, tiltYU, tiltYV, tiltYArcRadius, tiltYStartAngle, tiltYEndAngle, 32);
            const tiltYArcCurve = this.createCurveFromPoints(tiltYArcPoints);
            const tiltYTubeGeometry = new THREE.TubeGeometry(tiltYArcCurve, 32, 0.02, 8, false);
            if (this.tiltYArcLine.geometry) {
                this.tiltYArcLine.geometry.dispose();
            }
            this.tiltYArcLine.geometry = tiltYTubeGeometry;
            this.tiltYArcLine.visible = true;
            
            if (this.tiltYPieMesh) {
                this.scene.remove(this.tiltYPieMesh);
                if (this.tiltYPieMesh.geometry) this.tiltYPieMesh.geometry.dispose();
            }
            const tiltYPieShape = new THREE.Shape();
            tiltYPieShape.moveTo(0, 0);
            const tiltYPieSegments = 32;
            for (let i = 0; i <= tiltYPieSegments; i++) {
                const angle = tiltYStartAngle + (tiltYEndAngle - tiltYStartAngle) * (i / tiltYPieSegments);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                tiltYPieShape.lineTo(tiltYArcRadius * cosA, tiltYArcRadius * sinA);
            }
            tiltYPieShape.lineTo(0, 0);
            const tiltYPieGeometry = new THREE.ShapeGeometry(tiltYPieShape);
            this.tiltYPieMesh = new THREE.Mesh(tiltYPieGeometry, this.tiltYPieMaterial);
            this.tiltYPieMesh.position.copy(tiltYArcCenter);
            
            const tiltYUNorm = tiltYU.clone().normalize();
            const tiltYVNorm = tiltYV.clone().normalize();
            const tiltYNormal = new THREE.Vector3().crossVectors(tiltYUNorm, tiltYVNorm).normalize();
            
            const xAxis = new THREE.Vector3(1, 0, 0);
            const zAxis = new THREE.Vector3(0, 0, 1);
            
            const zToNormalQuat = new THREE.Quaternion();
            zToNormalQuat.setFromUnitVectors(zAxis, tiltYNormal);
            
            const xAfterZRot = xAxis.clone().applyQuaternion(zToNormalQuat);
            const xInPlane = xAfterZRot.clone().sub(tiltYNormal.clone().multiplyScalar(xAfterZRot.dot(tiltYNormal))).normalize();
            const angleToU = Math.acos(Math.max(-1, Math.min(1, xInPlane.dot(tiltYUNorm))));
            const cross = new THREE.Vector3().crossVectors(xInPlane, tiltYUNorm);
            const sign = cross.dot(tiltYNormal) >= 0 ? 1 : -1;
            const alignQuat = new THREE.Quaternion().setFromAxisAngle(tiltYNormal, sign * angleToU);
            
            const tiltYPieRotationQuat = new THREE.Quaternion();
            tiltYPieRotationQuat.multiplyQuaternions(alignQuat, zToNormalQuat);
            this.tiltYPieMesh.setRotationFromQuaternion(tiltYPieRotationQuat);
            this.scene.add(this.tiltYPieMesh);
            
            const tiltYCirclePoints = this.createCircularArcInPlane(tiltYArcCenter, tiltYU, tiltYV, tiltYArcRadius, 0, 2 * Math.PI, 64);
            this.tiltYDottedCircleLine.geometry.setFromPoints(tiltYCirclePoints);
            this.tiltYDottedCircleLine.geometry.attributes.position.needsUpdate = true;
            this.tiltYDottedCircleLine.computeLineDistances();
            this.tiltYDottedCircleLine.visible = true;
        } else {
            this.tiltYVerticalLine.visible = false;
            this.tiltYArcLine.visible = false;
            this.tiltYDottedCircleLine.visible = false;
            if (this.tiltYPieMesh) {
                this.scene.remove(this.tiltYPieMesh);
                if (this.tiltYPieMesh.geometry) this.tiltYPieMesh.geometry.dispose();
                this.tiltYPieMesh = null;
            }
        }
        
        this.penTipLinePositions[0] = this.penTipWorld.x;
        this.penTipLinePositions[1] = this.penTipWorld.y;
        this.penTipLinePositions[2] = this.penTipWorld.z;
        this.penTipLinePositions[3] = this.penTipLineBottom.x;
        this.penTipLinePositions[4] = this.penTipLineBottom.y;
        this.penTipLinePositions[5] = this.penTipLineBottom.z;
        
        this.penLineGeometry.attributes.position.needsUpdate = true;
        this.penLine.computeLineDistances();
        this.penTipLineGeometry.attributes.position.needsUpdate = true;
        this.penTipLine.computeLineDistances();
        
        // Update surface line
        const fixedLineLength = 2.0;
        const dx = this.penLineBottom.x - this.penTipLineBottom.x;
        const dz = this.penLineBottom.z - this.penTipLineBottom.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        
        let extendedEndX = this.penTipLineBottom.x;
        let extendedEndZ = this.penTipLineBottom.z;
        
        if (length > 0.001) {
            const dirX = dx / length;
            const dirZ = dz / length;
            extendedEndX = this.penTipLineBottom.x + dirX * fixedLineLength;
            extendedEndZ = this.penTipLineBottom.z + dirZ * fixedLineLength;
        }
        
        const surfaceLinePoints = [
            new THREE.Vector3(this.penTipLineBottom.x, this.yOffset, this.penTipLineBottom.z),
            new THREE.Vector3(extendedEndX, this.yOffset, extendedEndZ)
        ];
        this.surfaceLineGeometry.setFromPoints(surfaceLinePoints);
        this.surfaceLineGeometry.attributes.position.needsUpdate = true;
        
        // Update arc annotation
        const arcCenterX = this.penTipLineBottom.x;
        const arcCenterZ = this.penTipLineBottom.z;
        
        let surfaceLineAngle = Math.PI / 2;
        if (length > 0.001) {
            surfaceLineAngle = Math.atan2(dz, dx);
        }
        
        const startAngle = Math.PI / 2 - Math.PI;
        const endAngle = startAngle + (azimuth * Math.PI) / 180;
        const arcLength = Math.abs(azimuth);
        const arcSegments = Math.max(8, Math.floor(arcLength / 5));
        
        const dottedCircleSegments = 64;
        const azimuthArcCenter = new THREE.Vector3(arcCenterX, this.yOffset, arcCenterZ);
        const dottedCirclePoints = [];
        
        const xzPlaneQuat = new THREE.Quaternion();
        xzPlaneQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        
        for (let i = 0; i <= dottedCircleSegments; i++) {
            const angle = (2 * Math.PI * i) / dottedCircleSegments;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const localPoint = new THREE.Vector3(this.arcRadius * cosA, this.arcRadius * sinA, 0);
            const worldPoint = localPoint.clone().applyQuaternion(xzPlaneQuat);
            worldPoint.add(azimuthArcCenter);
            dottedCirclePoints.push(worldPoint);
        }
        
        this.dottedArcLine.geometry.setFromPoints(dottedCirclePoints);
        this.dottedArcLine.geometry.attributes.position.needsUpdate = true;
        this.dottedArcLine.computeLineDistances();
        this.dottedArcLine.visible = true;
        
        if (arcLength > 0.1) {
            const arcPoints = [];
            for (let i = 0; i <= arcSegments; i++) {
                const angle = endAngle + (startAngle - endAngle) * (i / arcSegments);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const localPoint = new THREE.Vector3(this.arcRadius * cosA, this.arcRadius * sinA, 0);
                const worldPoint = localPoint.clone().applyQuaternion(xzPlaneQuat);
                worldPoint.add(azimuthArcCenter);
                arcPoints.push(worldPoint);
            }
            
            const arcCurve = this.createCurveFromPoints(arcPoints);
            const tubeGeometry = new THREE.TubeGeometry(arcCurve, arcSegments, 0.02, 8, false);
            if (this.arcLine.geometry) {
                this.arcLine.geometry.dispose();
            }
            this.arcLine.geometry = tubeGeometry;
            this.arcLine.visible = true;
            
            if (this.arcPieMesh) {
                this.arcAnnotationGroup.remove(this.arcPieMesh);
                if (this.arcPieMesh.geometry) this.arcPieMesh.geometry.dispose();
            }
            const pieStartAngle = startAngle;
            const pieEndAngle = endAngle;
            const azimuthPieShape = new THREE.Shape();
            azimuthPieShape.moveTo(0, 0);
            for (let i = 0; i <= arcSegments; i++) {
                const angle = pieStartAngle + (pieEndAngle - pieStartAngle) * (i / arcSegments);
                const x = this.arcRadius * Math.cos(angle);
                const z = this.arcRadius * Math.sin(angle);
                azimuthPieShape.lineTo(x, z);
            }
            azimuthPieShape.lineTo(0, 0);
            const azimuthPieGeometry = new THREE.ShapeGeometry(azimuthPieShape);
            this.arcPieMesh = new THREE.Mesh(azimuthPieGeometry, this.arcPieMaterial);
            this.arcPieMesh.position.set(arcCenterX, this.yOffset, arcCenterZ);
            this.arcPieMesh.setRotationFromQuaternion(xzPlaneQuat);
            this.arcAnnotationGroup.add(this.arcPieMesh);
        } else {
            this.arcLine.visible = false;
            if (this.arcPieMesh) {
                this.arcAnnotationGroup.remove(this.arcPieMesh);
                if (this.arcPieMesh.geometry) this.arcPieMesh.geometry.dispose();
                this.arcPieMesh = null;
            }
        }
        
        // Update barrel rotation annotations
        const barrelCenter = this.penTopWorld.clone();
        const penAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
        
        const orientationQuat = new THREE.Quaternion();
        orientationQuat.multiplyQuaternions(altitudeQuat, new THREE.Quaternion());
        orientationQuat.premultiply(azimuthQuat);
        
        const u = new THREE.Vector3(1, 0, 0).applyQuaternion(orientationQuat).normalize();
        const v = new THREE.Vector3(0, 0, 1).applyQuaternion(orientationQuat).normalize();
        
        const barrelStartAngle = Math.PI / 2;
        const barrelEndAngle = Math.PI / 2 - (barrel * Math.PI) / 180;
        const barrelArcLength = Math.abs(barrel);
        const barrelArcSegments = Math.max(8, Math.floor(barrelArcLength / 5));
        
        if (this.showBarrelAnnotations) {
            if (barrelArcLength > 0.1) {
                const barrelArcPoints = this.createBarrelArcPoints(barrelCenter, penAxis, u, v, this.barrelArcRadius, barrelStartAngle, barrelEndAngle, barrelArcSegments);
                const barrelArcCurve = this.createCurveFromPoints(barrelArcPoints);
                const barrelTubeGeometry = new THREE.TubeGeometry(barrelArcCurve, barrelArcSegments, 0.02, 8, false);
                if (this.barrelArcLine.geometry) {
                    this.barrelArcLine.geometry.dispose();
                }
                this.barrelArcLine.geometry = barrelTubeGeometry;
                this.barrelArcLine.visible = true;
                
                if (this.barrelPieMesh) {
                    this.barrelAnnotationGroup.remove(this.barrelPieMesh);
                    if (this.barrelPieMesh.geometry) this.barrelPieMesh.geometry.dispose();
                }
                const pieStartAngle = (barrelStartAngle - Math.PI) - Math.PI;
                const pieEndAngle = (barrelEndAngle - Math.PI) - Math.PI;
                const pieShape = new THREE.Shape();
                pieShape.moveTo(0, 0);
                const pieSegments = 32;
                for (let i = 0; i <= pieSegments; i++) {
                    const angle = pieStartAngle + (pieEndAngle - pieStartAngle) * (i / pieSegments);
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);
                    pieShape.lineTo(this.barrelArcRadius * cosA, this.barrelArcRadius * sinA);
                }
                pieShape.lineTo(0, 0);
                const pieGeometry = new THREE.ShapeGeometry(pieShape);
                this.barrelPieMesh = new THREE.Mesh(pieGeometry, this.barrelPieMaterial);
                this.barrelPieMesh.position.copy(barrelCenter);
                
                const uNorm = u.clone().normalize();
                const vNorm = v.clone().normalize();
                const normal = new THREE.Vector3().crossVectors(uNorm, vNorm).normalize();
                
                const xAxis = new THREE.Vector3(1, 0, 0);
                const zAxis = new THREE.Vector3(0, 0, 1);
                
                const zToNormalQuat = new THREE.Quaternion();
                zToNormalQuat.setFromUnitVectors(zAxis, normal);
                
                const xAfterZRot = xAxis.clone().applyQuaternion(zToNormalQuat);
                const xInPlane = xAfterZRot.clone().sub(normal.clone().multiplyScalar(xAfterZRot.dot(normal))).normalize();
                const angleToU = Math.acos(Math.max(-1, Math.min(1, xInPlane.dot(uNorm))));
                const cross = new THREE.Vector3().crossVectors(xInPlane, uNorm);
                const sign = cross.dot(normal) >= 0 ? 1 : -1;
                const alignQuat = new THREE.Quaternion().setFromAxisAngle(normal, sign * angleToU);
                
                const pieRotationQuat = new THREE.Quaternion();
                pieRotationQuat.multiplyQuaternions(alignQuat, zToNormalQuat);
                this.barrelPieMesh.setRotationFromQuaternion(pieRotationQuat);
                this.barrelAnnotationGroup.add(this.barrelPieMesh);
            } else {
                this.barrelArcLine.visible = false;
                if (this.barrelPieMesh) {
                    this.barrelAnnotationGroup.remove(this.barrelPieMesh);
                    if (this.barrelPieMesh.geometry) this.barrelPieMesh.geometry.dispose();
                    this.barrelPieMesh = null;
                }
            }
            
            const barrelDottedCircleSegments = 64;
            const barrelDottedCirclePoints = this.createBarrelArcPoints(barrelCenter, penAxis, u, v, this.barrelArcRadius, 0, 2 * Math.PI, barrelDottedCircleSegments);
            this.barrelDottedCircleLine.geometry.setFromPoints(barrelDottedCirclePoints);
            this.barrelDottedCircleLine.geometry.attributes.position.needsUpdate = true;
            this.barrelDottedCircleLine.computeLineDistances();
            this.barrelDottedCircleLine.visible = true;
            
            const barrelFixedLineLength = 1.5;
            const barrelDir = u.clone().multiplyScalar(Math.cos(barrelEndAngle)).add(v.clone().multiplyScalar(Math.sin(barrelEndAngle)));
            barrelDir.normalize();
            const barrelDirection = barrelDir.multiplyScalar(barrelFixedLineLength);
            
            const barrelSurfaceLinePoints = [
                barrelCenter.clone(),
                barrelCenter.clone().add(barrelDirection)
            ];
            this.barrelSurfaceLine.geometry.setFromPoints(barrelSurfaceLinePoints);
            this.barrelSurfaceLine.geometry.attributes.position.needsUpdate = true;
            this.barrelSurfaceLine.visible = true;
        } else {
            this.barrelArcLine.visible = false;
            this.barrelDottedCircleLine.visible = false;
            this.barrelSurfaceLine.visible = false;
            if (this.barrelPieMesh) {
                this.barrelAnnotationGroup.remove(this.barrelPieMesh);
                if (this.barrelPieMesh.geometry) this.barrelPieMesh.geometry.dispose();
                this.barrelPieMesh = null;
            }
        }
    }
    
    animate() {
        const animateLoop = () => {
            requestAnimationFrame(animateLoop);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animateLoop();
    }
    
    // Public API methods
    setDistance(value) {
        this.distance = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setTiltAltitude(value) {
        this.tiltAltitude = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        const tiltX = this.calculateTiltX(this.tiltAltitude, this.tiltAzimuth);
        const tiltY = this.calculateTiltY(this.tiltAltitude, this.tiltAzimuth);
        return {
            shouldEnableAzimuth: this.tiltAltitude !== 0,
            tiltX: tiltX,
            tiltY: tiltY
        };
    }
    
    setTiltAzimuth(value) {
        this.tiltAzimuth = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        const tiltX = this.calculateTiltX(this.tiltAltitude, this.tiltAzimuth);
        const tiltY = this.calculateTiltY(this.tiltAltitude, this.tiltAzimuth);
        return {
            tiltX: tiltX,
            tiltY: tiltY
        };
    }
    
    setBarrelRotation(value) {
        this.barrelRotation = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setTabletPositionX(value) {
        this.tabletOffsetX = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setTabletPositionZ(value) {
        this.tabletOffsetZ = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setAzimuthAnnotationsVisible(visible) {
        this.arcAnnotationGroup.visible = visible;
        this.surfaceLine.visible = visible;
    }
    
    setAltitudeAnnotationsVisible(visible) {
        this.showAltitudeAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setBarrelAnnotationsVisible(visible) {
        this.showBarrelAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setTiltXAnnotationsVisible(visible) {
        this.showTiltXAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setTiltYAnnotationsVisible(visible) {
        this.showTiltYAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }
    
    setAxisMarkersVisible(visible) {
        this.xArrow.visible = visible;
        this.yArrow.visible = visible;
        this.zArrow.visible = visible;
        this.xLabel.visible = visible;
        this.yLabel.visible = visible;
        this.zLabel.visible = visible;
    }
    
    setAxonometricView(enabled) {
        if (enabled) {
            this.orthographicCamera.position.copy(this.perspectiveCamera.position);
            this.orthographicCamera.rotation.copy(this.perspectiveCamera.rotation);
            this.camera = this.orthographicCamera;
        } else {
            this.perspectiveCamera.position.copy(this.orthographicCamera.position);
            this.perspectiveCamera.rotation.copy(this.orthographicCamera.rotation);
            this.camera = this.perspectiveCamera;
        }
        this.controls.object = this.camera;
        this.controls.update();
    }
    
    reset() {
        return {
            distance: 0,
            tiltAltitude: 0,
            tiltAzimuth: 0,
            barrelRotation: 0,
            tabletX: 8,
            tabletZ: 4.5
        };
    }
    
    exportAsPNG() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'Pen3DSim-render.png';
        link.href = dataURL;
        link.click();
    }
    
    onResize() {
        const aspect = this.viewer.clientWidth / this.viewer.clientHeight;
        
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        
        this.orthographicCamera.left = -this.orthoSize * aspect;
        this.orthographicCamera.right = this.orthoSize * aspect;
        this.orthographicCamera.updateProjectionMatrix();
        
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
    }
    
    updateCursorRotation() {
        if (!this.cursorArrowMesh || !this.cursorBaseQuat) {
            return;
        }
        
        // Step 1: Apply Y-axis rotation at tip (around vertical axis)
        const tipYRotQuat = new THREE.Quaternion();
        tipYRotQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (this.cursorTipRotationY * Math.PI) / 180);
        
        // Step 2: Combine base rotation with Y-axis rotation
        // The Y rotation should be applied after the base rotation (to rotate the already-oriented cursor)
        const baseWithYRot = new THREE.Quaternion();
        baseWithYRot.multiplyQuaternions(tipYRotQuat, this.cursorBaseQuat);
        
        // Step 3: Rotate around the long axis by cursorRotation degrees
        // Need to recalculate long axis direction after Y rotation
        const localXAxis = new THREE.Vector3(1, 0, 0);
        const longAxisDir = localXAxis.applyQuaternion(baseWithYRot).normalize();
        
        const longAxisRotQuat = new THREE.Quaternion();
        longAxisRotQuat.setFromAxisAngle(longAxisDir, (this.cursorRotation * Math.PI) / 180);
        
        // Combine: first apply base rotation with Y rotation, then rotate around long axis
        // For quaternions: final = longAxisRot * (tipYRot * baseQuat)
        const finalQuat = new THREE.Quaternion();
        finalQuat.multiplyQuaternions(longAxisRotQuat, baseWithYRot);
        
        this.cursorArrowMesh.setRotationFromQuaternion(finalQuat);
    }
    
    setCursorRotation(angle) {
        this.cursorRotation = angle;
        this.updateCursorRotation();
    }
    
    setCursorTipRotationY(angle) {
        this.cursorTipRotationY = angle;
        this.updateCursorRotation();
    }
    
    // Easing function for smooth animation (ease-in-out)
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Animate from default position to demo position
    animateToDemo(onProgress) {
        // Default values (start)
        const start = {
            distance: 0,
            tiltAltitude: 0,
            tiltAzimuth: 0,
            barrelRotation: 0,
            tabletX: 8,
            tabletZ: 4.5
        };
        
        // Demo values (end)
        const end = {
            distance: 0,
            tiltAltitude: 45,
            tiltAzimuth: 242,
            barrelRotation: 318,
            tabletX: 8.6,
            tabletZ: 5.3
        };
        
        const duration = 4000; // 4 seconds
        const startTime = performance.now();
        let animationFrameId = null;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Apply easing
            const easedProgress = this.easeInOutCubic(progress);
            
            // Interpolate values
            const current = {
                distance: start.distance + (end.distance - start.distance) * easedProgress,
                tiltAltitude: start.tiltAltitude + (end.tiltAltitude - start.tiltAltitude) * easedProgress,
                tiltAzimuth: this.interpolateAngle(start.tiltAzimuth, end.tiltAzimuth, easedProgress),
                barrelRotation: this.interpolateAngle(start.barrelRotation, end.barrelRotation, easedProgress),
                tabletX: start.tabletX + (end.tabletX - start.tabletX) * easedProgress,
                tabletZ: start.tabletZ + (end.tabletZ - start.tabletZ) * easedProgress
            };
            
            // Update internal state
            this.distance = current.distance;
            this.tiltAltitude = current.tiltAltitude;
            this.tiltAzimuth = current.tiltAzimuth;
            this.barrelRotation = current.barrelRotation;
            this.tabletOffsetX = current.tabletX;
            this.tabletOffsetZ = current.tabletZ;
            
            // Update pen transform
            this.updatePenTransform(current.distance, current.tiltAltitude, current.tiltAzimuth, current.barrelRotation);
            
            // Call progress callback to update UI
            if (onProgress) {
                onProgress(current, progress);
            }
            
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                // Animation complete
                animationFrameId = null;
            }
        };
        
        animationFrameId = requestAnimationFrame(animate);
        
        // Return a function to cancel the animation
        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
    }
    
    // Helper to interpolate angles (handles wrapping around 360)
    interpolateAngle(start, end, t) {
        // Normalize angles to 0-360 range
        start = ((start % 360) + 360) % 360;
        end = ((end % 360) + 360) % 360;
        
        // Calculate difference
        let diff = end - start;
        
        // Always go forward (increasing angle) if end > start
        // Only wrap if going forward would be more than 360 degrees
        if (diff < 0) {
            // end < start, so we need to wrap forward
            diff += 360;
        }
        // If diff > 0 and < 360, just use it as is (forward direction)
        // If diff >= 360, that shouldn't happen with normalized angles, but handle it
        if (diff >= 360) {
            diff = diff % 360;
        }
        
        let result = start + diff * t;
        
        // Normalize result to 0-360 range
        result = ((result % 360) + 360) % 360;
        
        return result;
    }
}

