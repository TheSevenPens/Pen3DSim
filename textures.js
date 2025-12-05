// Textures Factory - Creates all textures used in Pen3DSim

class TexturesFactory {
    // Create a checkerboard texture for the pen
    static createCheckerboardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        const checkSize = 256;
        const checksX = canvas.width / checkSize;
        const checksY = canvas.height / checkSize;
        
        const checkColor1 = '#ff77dd';
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
    
    // Create a checkerboard texture for the tablet
    static createTabletCheckerboardTexture(tabletWidth, tabletDepth) {
        // Grid spacing is 0.25 inches, tablet is 16x9 inches
        // So we need 64x36 squares
        const gridSpacing = 0.25;
        const squaresX = tabletWidth / gridSpacing; // 64
        const squaresZ = tabletDepth / gridSpacing; // 36
        
        // Create a high-resolution texture for crisp squares
        // Use aspect ratio to ensure squares appear square on the tablet
        const baseTextureSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = baseTextureSize;
        canvas.height = Math.round(baseTextureSize * (tabletDepth / tabletWidth)); // Account for aspect ratio
        const context = canvas.getContext('2d');
        
        const squareSizeX = canvas.width / squaresX;
        const squareSizeZ = canvas.height / squaresZ;
        
        // Use brighter colors for better visibility
        const checkColor1 = '#505050'; // Medium gray
        const checkColor2 = '#404040'; // Light gray
        
        for (let z = 0; z < squaresZ; z++) {
            for (let x = 0; x < squaresX; x++) {
                const isEven = (x + z) % 2 === 0;
                context.fillStyle = isEven ? checkColor1 : checkColor2;
                context.fillRect(x * squareSizeX, z * squareSizeZ, squareSizeX, squareSizeZ);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        return texture;
    }
    
    // Create a text label texture for axis markers
    static createTextLabelTexture(text, color) {
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
        return texture;
    }
}

