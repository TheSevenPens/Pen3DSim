// Animation handlers for individual parameter animations
function initializeAnimations(sim, uiElements) {
    const {
        tiltAzimuthSlider,
        tiltAltitudeSlider,
        barrelRotationSlider,
        altitudeValueDisplay,
        azimuthValueDisplay,
        barrelRotationValueDisplay,
        updateAzimuthSliderState,
        animationsFlyout
    } = uiElements;

    // Animation state
    let cancelTiltXAnimation = null;
    let cancelTiltYAnimation = null;
    let cancelBarrelAnimation = null;

    // Tilt X animation (animates altitude from 0 to 45)
    document.getElementById('anim-tilt-altitude-btn').addEventListener('click', () => {
        // Close animations flyout immediately
        if (animationsFlyout && animationsFlyout.classList.contains('open')) {
            animationsFlyout.classList.remove('open');
        }
        
        // Cancel any existing animation
        if (cancelTiltXAnimation) {
            cancelTiltXAnimation();
        }
        
        // Wait 0.5 seconds before starting animation
        setTimeout(() => {
            // Animate tilt altitude from 0 to 45 (this affects tiltX)
            // Keep current azimuth to only change altitude
            const currentAzimuth = parseFloat(tiltAzimuthSlider.value);
            const startAltitude = 0;
            const endAltitude = 45;
            
            // Set initial altitude to 0
            sim.setTiltAltitude(startAltitude);
            sim.setTiltAzimuth(currentAzimuth);
            
            const duration = 8000; // 8 seconds
            const startTime = performance.now();
            let animationFrameId = null;
            
            const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Apply easing
            const easedProgress = sim.easeInOutCubic(progress);
            
            // Interpolate altitude
            const currentAltitude = startAltitude + (endAltitude - startAltitude) * easedProgress;
            
            // Update only altitude (keep azimuth and everything else the same)
            const result = sim.setTiltAltitude(currentAltitude);
            sim.setTiltAzimuth(currentAzimuth);
            
            // Update UI displays
            tiltAltitudeSlider.value = currentAltitude;
            tiltAzimuthSlider.value = currentAzimuth;
            altitudeValueDisplay.textContent = Math.round(currentAltitude);
            azimuthValueDisplay.textContent = Math.round(currentAzimuth);
            document.getElementById('tilt-x-value').textContent = result.tiltX.toFixed(1);
            document.getElementById('tilt-y-value').textContent = result.tiltY.toFixed(1);
            updateAzimuthSliderState();
            
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                animationFrameId = null;
                cancelTiltXAnimation = null;
            }
        };
        
        animationFrameId = requestAnimationFrame(animate);
        
        cancelTiltXAnimation = () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
        }, 500);
    });

    // Tilt Y animation (animates azimuth from 0 to 252)
    document.getElementById('anim-tilt-azimuth-btn').addEventListener('click', () => {
        // Close animations flyout immediately
        if (animationsFlyout && animationsFlyout.classList.contains('open')) {
            animationsFlyout.classList.remove('open');
        }
        
        // Cancel any existing animation
        if (cancelTiltYAnimation) {
            cancelTiltYAnimation();
        }
        
        // Wait 0.5 seconds before starting animation
        setTimeout(() => {
            // Animate tilt azimuth from 0 to 252 (this affects tiltY)
            // Keep current altitude to only change azimuth
            const currentAltitude = parseFloat(tiltAltitudeSlider.value);
            const startAzimuth = 0;
            const endAzimuth = 252;
            
            // Set initial azimuth to 0
            sim.setTiltAltitude(currentAltitude);
            sim.setTiltAzimuth(startAzimuth);
            
            const duration = 8000; // 8 seconds
            const startTime = performance.now();
            let animationFrameId = null;
            
            const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Apply easing
            const easedProgress = sim.easeInOutCubic(progress);
            
            // Interpolate azimuth
            const currentAzimuth = sim.interpolateAngle(startAzimuth, endAzimuth, easedProgress);
            
            // Update only azimuth (keep altitude and everything else the same)
            sim.setTiltAltitude(currentAltitude);
            const result = sim.setTiltAzimuth(currentAzimuth);
            
            // Update UI displays
            tiltAltitudeSlider.value = currentAltitude;
            tiltAzimuthSlider.value = currentAzimuth;
            altitudeValueDisplay.textContent = Math.round(currentAltitude);
            azimuthValueDisplay.textContent = Math.round(currentAzimuth);
            document.getElementById('tilt-x-value').textContent = result.tiltX.toFixed(1);
            document.getElementById('tilt-y-value').textContent = result.tiltY.toFixed(1);
            updateAzimuthSliderState();
            
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                animationFrameId = null;
                cancelTiltYAnimation = null;
            }
        };
        
        animationFrameId = requestAnimationFrame(animate);
        
        cancelTiltYAnimation = () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
        }, 500);
    });

    // Barrel rotation animation (animates from 0 to 316)
    document.getElementById('anim-barrel-btn').addEventListener('click', () => {
        // Close animations flyout immediately
        if (animationsFlyout && animationsFlyout.classList.contains('open')) {
            animationsFlyout.classList.remove('open');
        }
        
        // Cancel any existing animation
        if (cancelBarrelAnimation) {
            cancelBarrelAnimation();
        }
        
        // Wait 0.5 seconds before starting animation
        setTimeout(() => {
            // Animate barrel rotation from 0 to 316
            const startBarrel = 0;
            const endBarrel = 316;
            
            // Set initial barrel rotation to 0
            sim.setBarrelRotation(startBarrel);
            
            const duration = 8000; // 8 seconds
            const startTime = performance.now();
            let animationFrameId = null;
            
            const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Apply easing
            const easedProgress = sim.easeInOutCubic(progress);
            
            // Interpolate barrel rotation
            const currentBarrel = sim.interpolateAngle(startBarrel, endBarrel, easedProgress);
            
            // Update only barrel rotation (keep everything else the same)
            sim.setBarrelRotation(currentBarrel);
            
            // Update UI displays
            barrelRotationSlider.value = currentBarrel;
            barrelRotationValueDisplay.textContent = Math.round(currentBarrel);
            
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                animationFrameId = null;
                cancelBarrelAnimation = null;
            }
        };
        
        animationFrameId = requestAnimationFrame(animate);
        
        cancelBarrelAnimation = () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
        }, 500);
    });
}

