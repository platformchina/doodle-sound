# Doodle to Sound

A simple web application that turns your doodles into sound!

## How to Use

1.  Open `index.html` in your web browser.
2.  Select a brush color from the palette or the custom color picker.
3.  Draw on the canvas.
4.  Click the "Turn Drawing into Sound" button to hear your creation.
5.  Click "Clear Drawing" to start over.

## How it Works

*   **Drawing:** Uses the HTML5 Canvas API.
*   **Sound:** Uses the Web Audio API.
*   **Mapping:**
    *   The horizontal position (X-axis) on the canvas represents time.
    *   The vertical position (Y-axis) represents pitch (frequency). Higher on the canvas means a higher pitch.
    *   Different colors map to different oscillator waveforms (timbres):
        *   Red: Sine wave
        *   Green: Square wave
        *   Blue: Sawtooth wave
        *   Yellow: Triangle wave
        *   Black & Other Custom Colors: Sine wave (default)

## Deployment

This project is a static site (HTML, CSS, JS) and can be easily deployed on platforms like:

*   **Vercel:**
    1.  Push this code to a GitHub repository.
    2.  Sign up or log in to [Vercel](https://vercel.com).
    3.  Import your GitHub repository.
    4.  Vercel will automatically detect it as a static site and deploy it. No special configuration is usually needed.
*   **Netlify:** Similar process to Vercel.
*   **GitHub Pages:** Can be enabled directly from the repository settings.

## Files

*   `index.html`: The main HTML structure.
*   `style.css`: Styles for the application.
*   `script.js`: JavaScript for drawing logic and audio generation.