document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('doodleCanvas');
    const ctx = canvas.getContext('2d');
    const playSoundBtn = document.getElementById('playSoundBtn');
    const clearCanvasBtn = document.getElementById('clearCanvasBtn');
    const colorBtns = document.querySelectorAll('.color-btn');
    const customColorPicker = document.getElementById('customColorPicker');
    const lineWidthSlider = document.getElementById('lineWidthSlider');
    const lineWidthValueSpan = document.getElementById('lineWidthValue');

    let drawing = false;
    let currentColor = 'black';
    let currentLineWidth = 5;
    let audioCtx = null;

    function initializeCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
    }
    
    lineWidthSlider.value = currentLineWidth;
    lineWidthValueSpan.textContent = currentLineWidth;
    initializeCanvas();
    setActiveColorButton(currentColor);

    function setActiveColorButton(selectedColor) {
        colorBtns.forEach(btn => {
            const btnColor = btn.dataset.color;
            let isMatch = false;
            if (selectedColor.startsWith('#')) {
                isMatch = (mapColorNameToHex(btnColor).toLowerCase() === selectedColor.toLowerCase());
            } else {
                isMatch = (btnColor === selectedColor);
            }
            btn.classList.toggle('active', isMatch);
        });
    }
    
    lineWidthSlider.addEventListener('input', (e) => {
        currentLineWidth = parseInt(e.target.value, 10);
        lineWidthValueSpan.textContent = currentLineWidth;
        ctx.lineWidth = currentLineWidth;
    });

    function startPosition(e) {
        drawing = true;
        const { x, y } = getMousePos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function endPosition() {
        if (drawing) {
            ctx.stroke();
        }
        drawing = false;
        ctx.beginPath();
    }

    function getMousePos(canvasDom, event) {
        const rect = canvasDom.getBoundingClientRect();
        const scaleX = canvasDom.width / rect.width;
        const scaleY = canvasDom.height / rect.height;
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function draw(e) {
        if (!drawing) return;
        const { x, y } = getMousePos(canvas, e);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseleave', endPosition);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); endPosition(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            ctx.strokeStyle = currentColor;
            setActiveColorButton(currentColor);
            customColorPicker.value = mapColorNameToHex(currentColor);
        });
    });

    customColorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        ctx.strokeStyle = currentColor;
        setActiveColorButton(currentColor);
    });
    customColorPicker.addEventListener('change', (e) => {
        currentColor = e.target.value;
        ctx.strokeStyle = currentColor;
        setActiveColorButton(currentColor);
    });

    clearCanvasBtn.addEventListener('click', () => {
        initializeCanvas();
    });

    function mapColorNameToHex(colorName) {
        switch (colorName.toLowerCase()) {
            case 'red': return '#FF0000';
            case 'green': return '#008000';
            case 'blue': return '#0000FF';
            case 'black': return '#000000';
            case 'yellow': return '#FFFF00';
            default: return colorName;
        }
    }
    
    function getAudioContext() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                alert("Web Audio API is not supported in this browser.");
                console.error("Error creating AudioContext:", e);
                return null;
            }
        }
        return audioCtx;
    }

    // --- playNote function modified for beautiful Piano with Echo ---
    function playNote(frequency, startTime, duration = 0.6, volume = 0.2) { 
        const actx = getAudioContext();
        if (!actx || actx.state === 'closed') return;

        const now = actx.currentTime + startTime;

        // --- Oscillator (Sound Source) ---
        const oscillator = actx.createOscillator();
        oscillator.type = 'triangle'; // Triangle wave for a richer, yet soft tone
        oscillator.frequency.setValueAtTime(frequency, now);
        
        // --- Low-pass Filter (to soften the sound, remove harshness) ---
        const filter = actx.createBiquadFilter();
        filter.type = 'lowpass';
        // Adjust cutoff frequency: higher for brighter, lower for mellower.
        // 800-1200Hz is a good starting range for piano-like warmth.
        filter.frequency.setValueAtTime(1000, now); 
        filter.Q.setValueAtTime(0.7, now); // Lower Q for less resonance

        // --- Main Gain (for ADSR envelope of the direct sound) ---
        const mainGain = actx.createGain();

        // --- Echo/Delay Path ---
        const delayNode = actx.createDelay(1.0); // Max delay time 1 second
        const feedbackGain = actx.createGain();
        const wetGain = actx.createGain(); // Controls the volume of the echo

        // --- Connections ---
        oscillator.connect(filter);
        filter.connect(mainGain);         // Filtered sound to main gain (direct path)
        mainGain.connect(actx.destination);

        filter.connect(delayNode);          // Filtered sound also goes to delay input
        delayNode.connect(feedbackGain);    // Output of delay to feedback gain
        feedbackGain.connect(delayNode);    // Feedback gain back to delay input (creates repeating echoes)
        delayNode.connect(wetGain);         // Output of delay to wet gain (controls echo volume)
        wetGain.connect(actx.destination);  // Echo path to destination

        // --- Main Sound Envelope (ADSR on mainGain) ---
        const peakVolume = volume;
        const attackTime = 0.015;          // Quick attack
        const decayTime = duration * 0.25; 
        const sustainLevel = peakVolume * 0.5; 
        
        mainGain.gain.setValueAtTime(0.0001, now); // Start silent
        mainGain.gain.linearRampToValueAtTime(peakVolume, now + attackTime); // Attack
        mainGain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime); // Decay to sustain
        mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Release over rest of duration

        // --- Echo Parameters ---
        const delayTime = 0.3;  // Time between echoes in seconds
        const feedbackAmount = 0.35; // How much of the echo is fed back (0 to <1)
        const echoVolume = volume * 0.4; // Echo is quieter than direct sound

        delayNode.delayTime.setValueAtTime(delayTime, now);
        feedbackGain.gain.setValueAtTime(feedbackAmount, now);
        wetGain.gain.setValueAtTime(0, now); // Start echo silent
        wetGain.gain.linearRampToValueAtTime(echoVolume, now + attackTime + 0.05); // Echo fades in slightly after direct sound
        wetGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + delayTime * 2); // Echo fades out longer

        // --- Start and Stop Oscillator ---
        oscillator.start(now);
        oscillator.stop(now + duration + delayTime * 3); // Stop oscillator after main sound and echoes have likely faded
    }
    
    playSoundBtn.addEventListener('click', async () => {
        const actx = getAudioContext();
        if (!actx) return;

        if (actx.state === 'suspended') {
            try { await actx.resume(); } catch (e) {
                console.error("Error resuming AudioContext:", e);
                alert("Could not start audio. Please interact with the page again.");
                return;
            }
        }
        if (actx.state === 'closed') {
             alert("AudioContext is closed. Please reload the page.");
             return;
        }

        const minVolume = 0.04; // Slightly increased min volume for presence
        const maxVolume = 0.25; // Reduced max to prevent clipping with echoes
        const minSliderVal = parseInt(lineWidthSlider.min, 10);
        const maxSliderVal = parseInt(lineWidthSlider.max, 10);
        
        let masterVolume = minVolume;
        if (maxSliderVal > minSliderVal) {
             masterVolume = minVolume + 
                ((currentLineWidth - minSliderVal) / (maxSliderVal - minSliderVal)) * 
                (maxVolume - minVolume);
        } else if (currentLineWidth >= maxSliderVal) {
            masterVolume = maxVolume;
        }
        masterVolume = Math.max(minVolume, Math.min(maxVolume, masterVolume));

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalDurationSeconds = 3.5; // Can adjust overall playback speed
        const timeStep = totalDurationSeconds / canvas.width;
        const noteDuration = 0.6; // Duration for each piano note including its tail, allows echo to develop

        const minFreq = 80;  // Lower min for more bassy piano notes
        const maxFreq = 1500; // Max freq for piano (A0 to C8 is ~27.5Hz to ~4186Hz, this is a practical range)

        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                if (a > 200 && !(r === 255 && g === 255 && b === 255 && a === 255)) {
                    const frequency = maxFreq - ((y / canvas.height) * (maxFreq - minFreq));
                    playNote(frequency, x * timeStep, noteDuration, masterVolume);
                }
            }
        }
    });
});