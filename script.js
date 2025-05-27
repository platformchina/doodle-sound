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
    let audioCtx = null; // AudioContext 将在这里初始化

    // --- Canvas Setup and Initialization ---
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

    // --- Drawing Logic ---
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

    // --- Controls Logic ---
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
    
    // --- Web Audio API Logic ---
    function getAudioContext() {
        if (!audioCtx) {
            try {
                console.log("Attempting to create AudioContext...");
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext created. State:", audioCtx.state);
            } catch (e) {
                alert("Web Audio API is not supported in this browser.");
                console.error("Error creating AudioContext:", e);
                return null;
            }
        }
        return audioCtx;
    }

    function playNote(frequency, scheduleTime, duration = 0.7, volume = 0.2) { 
        const actx = getAudioContext(); // Ensures audioCtx is initialized
        if (!actx || actx.state === 'closed') {
            console.error("playNote: AudioContext not available or closed.");
            return;
        }
        // It's good practice that actx.state is 'running' here, ensured by playSoundBtn
        // console.log(`playNote called: Freq=${frequency.toFixed(2)}, SchedTime=${scheduleTime.toFixed(2)}, Dur=${duration}, Vol=${volume.toFixed(2)}, ACState=${actx.state}`);

        // --- Oscillator (Sound Source) ---
        const oscillator = actx.createOscillator();
        oscillator.type = 'triangle'; 
        oscillator.frequency.setValueAtTime(frequency, scheduleTime);
        
        // --- Low-pass Filter (to soften the sound) ---
        const filter = actx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, scheduleTime); 
        filter.Q.setValueAtTime(0.7, scheduleTime); 

        // --- Main Gain (for ADSR envelope of the direct sound) ---
        const mainGain = actx.createGain();

        // --- Echo/Delay Path ---
        const delayNode = actx.createDelay(1.0); 
        const feedbackGain = actx.createGain();
        const wetGain = actx.createGain(); 

        // --- Connections ---
        oscillator.connect(filter);
        filter.connect(mainGain);         
        mainGain.connect(actx.destination);

        filter.connect(delayNode);          
        delayNode.connect(feedbackGain);    
        feedbackGain.connect(delayNode);    
        delayNode.connect(wetGain);         
        wetGain.connect(actx.destination);  

        // --- Main Sound Envelope (ADSR on mainGain) ---
        const peakVolume = volume;
        const attackTime = 0.015;          
        const decayTime = duration * 0.25; 
        const sustainLevel = peakVolume * 0.5; 
        
        mainGain.gain.setValueAtTime(0.0001, scheduleTime); 
        mainGain.gain.linearRampToValueAtTime(peakVolume, scheduleTime + attackTime); 
        mainGain.gain.exponentialRampToValueAtTime(sustainLevel, scheduleTime + attackTime + decayTime); 
        mainGain.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + duration); 

        // --- Echo Parameters ---
        const delayTimeValue = 0.33;  // Delay time for echo
        const feedbackAmount = 0.35; 
        const echoVolume = volume * 0.45; 

        delayNode.delayTime.setValueAtTime(delayTimeValue, scheduleTime);
        feedbackGain.gain.setValueAtTime(feedbackAmount, scheduleTime);
        
        wetGain.gain.setValueAtTime(0.0001, scheduleTime); // Start echo quiet
        // Echo fades in slightly after the main attack, giving a sense of space
        wetGain.gain.linearRampToValueAtTime(echoVolume, scheduleTime + attackTime + 0.1); 
        // Echo fades out over a longer period
        wetGain.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + duration + delayTimeValue * 2); 

        // --- Start and Stop Oscillator ---
        oscillator.start(scheduleTime);
        // Stop oscillator well after main sound and echoes have faded
        oscillator.stop(scheduleTime + duration + delayTimeValue * 3); 
    }
    
    playSoundBtn.addEventListener('click', async () => {
        const actx = getAudioContext(); // Initialize or get existing AudioContext
        if (!actx) {
            console.error("playSoundBtn: AudioContext could not be obtained.");
            return;
        }

        console.log("Play button clicked. AudioContext initial state:", actx.state);
        // Resume AudioContext if it's suspended (crucial for browsers' autoplay policies)
        if (actx.state === 'suspended') {
            try {
                await actx.resume();
                console.log("AudioContext resumed successfully. New state:", actx.state);
            } catch (e) {
                console.error("Error resuming AudioContext:", e);
                alert("Could not start audio. Please interact with the page again or check browser console.");
                return;
            }
        }
        
        if (actx.state !== 'running') {
            console.warn("playSoundBtn: AudioContext is not in 'running' state after attempt to resume. State:", actx.state);
            // alert("Audio playback might not work. AudioContext state: " + actx.state);
            // Depending on the browser, it might still play if scheduled, but this is a warning sign.
        }

        const minVolume = 0.04; 
        const maxVolume = 0.22; // Max volume slightly reduced to avoid clipping with echo
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
        console.log("Master Volume calculated:", masterVolume.toFixed(3));

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalDurationSeconds = 3.0; 
        const timeStep = totalDurationSeconds / canvas.width;
        const noteDuration = 0.7; // Increased for more noticeable piano tail and echo

        const minFreq = 70;  
        const maxFreq = 1600; 

        // Current time in the audio context, all scheduled times are relative to this + offset
        const audioContextCurrentTime = actx.currentTime; 

        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                if (a > 200 && !(r === 255 && g === 255 && b === 255 && a === 255)) {
                    const frequency = maxFreq - ((y / canvas.height) * (maxFreq - minFreq));
                    // Schedule time for this note: base time + offset based on x position
                    const scheduledPlayTime = audioContextCurrentTime + (x * timeStep);
                    playNote(frequency, scheduledPlayTime, noteDuration, masterVolume);
                }
            }
        }
        console.log("All notes scheduled for playback.");
    });
});