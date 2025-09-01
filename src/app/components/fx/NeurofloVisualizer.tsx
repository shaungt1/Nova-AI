import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Exposed customization props for consumers of the component
export interface NeurofloOptions {
    smoothing?: number;
    fft?: number;
    minDecibels?: number;
    scale?: number;
    glow?: number;
    color1?: [number, number, number];
    color2?: [number, number, number];
    color3?: [number, number, number];
    fillOpacity?: number;
    lineWidth?: number;
    blend?: GlobalCompositeOperation;
    shift?: number;
    width?: number;
    amp?: number;
    height?: number;
}

interface Props {
    options?: NeurofloOptions;
    className?: string;
    style?: React.CSSProperties;
    isActive?: boolean; // New prop to control activation
    isBotSpeaking?: boolean; // New prop to trigger visualizer for bot audio
    isHumanMicOn?: boolean; // New prop to trigger visualizer for user mic
}

export interface NeurofloVisualizerHandle {
    trigger: () => void;
}

/**
 * NeurofloVisualizer
 *
 * A microphone-driven frequency visualizer rendered via bezier waveform paths on a canvas.
 * Supports 3 layers (RGB) of curved visualizations with adjustable amplitude, smoothing, and styling.
 *
 * 📈 Visualization Breakdown:
 *
 *         .
 *     __/\_/ \_/\__
 *       \/ \ / \/
 *         '
 *     1 2 3 4 5  (peaks)
 *
 */
const NeurofloVisualizer = forwardRef<NeurofloVisualizerHandle, Props>(
    ({ options = {}, className = '', style, isActive = false, isBotSpeaking = false, isHumanMicOn = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

        // Static width, but dynamic height via props
        const WIDTH = 1000;
        const HEIGHT = options.height || 120;

        // Default visual and audio processing options
        const opts = {
            smoothing: 0.6,
            fft: 8,
            minDecibels: -70,
            scale: 0.2,
            glow: 10,
            color1: [203, 36, 128],
            color2: [41, 200, 192],
            color3: [24, 137, 218],
            fillOpacity: 0.6,
            lineWidth: 1,
            blend: 'screen' as GlobalCompositeOperation,
            shift: 50,
            width: 60,
            amp: 1,
            ...options
        };

        // Launch visualization on mount if active
        useEffect(() => {
            if (isActive || isBotSpeaking || isHumanMicOn) {
                start();
            }
        }, [isActive, isBotSpeaking, isHumanMicOn]);

        // Frequency band shuffle to avoid visual clustering
        const shuffle = [1, 3, 0, 4, 2];

        const range = (i: number): number[] => Array.from(Array(i).keys());

        // Select a frequency band for a color channel and peak index
        const freq = (channel: number, i: number, data: Uint8Array): number => {
            const band = 2 * channel + shuffle[i] * 6;
            return data[band];
        };

        // Determines how much a peak rises based on position and amp
        const scale = (i: number): number => {
            const x = Math.abs(2 - i); // peak distance from center
            const s = 3 - x; // central peaks are stronger
            return (s / 3) * opts.amp;
        };

        /**
         * Render a waveform path for a given channel (0, 1, or 2 = R, G, B)
         * @param ctx canvas 2D context
         * @param channel index of RGB waveform
         * @param data Uint8Array of FFT frequency data
         */
        const path = (ctx: CanvasRenderingContext2D, channel: number, data: Uint8Array) => {
            const color = opts[`color${channel + 1}` as keyof typeof opts] as [number, number, number];

            // Set drawing styles
            ctx.fillStyle = `rgba(${color.join(',')}, ${opts.fillOpacity})`;
            ctx.strokeStyle = ctx.shadowColor = `rgb(${color.join(',')})`;
            ctx.lineWidth = opts.lineWidth;
            ctx.shadowBlur = opts.glow;
            ctx.globalCompositeOperation = opts.blend;

            const m = HEIGHT / 2; // midline
            const offset = (WIDTH - 15 * opts.width) / 2;
            const x = range(15).map((i) => offset + channel * opts.shift + i * opts.width);
            const y = range(5).map((i) => Math.max(0, m - scale(i) * freq(channel, i, data)));
            const h = 2 * m;

            ctx.beginPath();
            ctx.moveTo(0, m); // start left midline
            ctx.lineTo(x[0], m + 1); // entry point

            // Top waveform bezier curves
            ctx.bezierCurveTo(x[1], m + 1, x[2], y[0], x[3], y[0]);
            ctx.bezierCurveTo(x[4], y[0], x[4], y[1], x[5], y[1]);
            ctx.bezierCurveTo(x[6], y[1], x[6], y[2], x[7], y[2]);
            ctx.bezierCurveTo(x[8], y[2], x[8], y[3], x[9], y[3]);
            ctx.bezierCurveTo(x[10], y[3], x[10], y[4], x[11], y[4]);
            ctx.bezierCurveTo(x[12], y[4], x[12], m, x[13], m);

            // Close top
            ctx.lineTo(WIDTH, m + 1);
            ctx.lineTo(x[13], m - 1);

            // Bottom mirrored bezier waveform
            ctx.bezierCurveTo(x[12], m, x[12], h - y[4], x[11], h - y[4]);
            ctx.bezierCurveTo(x[10], h - y[4], x[10], h - y[3], x[9], h - y[3]);
            ctx.bezierCurveTo(x[8], h - y[3], x[8], h - y[2], x[7], h - y[2]);
            ctx.bezierCurveTo(x[6], h - y[2], x[6], h - y[1], x[5], h - y[1]);
            ctx.bezierCurveTo(x[4], h - y[1], x[4], h - y[0], x[3], h - y[0]);
            ctx.bezierCurveTo(x[2], h - y[0], x[1], m, x[0], m);
            ctx.lineTo(0, m);

            ctx.fill();
            ctx.stroke();
        };

        /**
         * Starts the animation loop via requestAnimationFrame
         */
        const visualize = () => {
            if (!analyser || !canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            const data = new Uint8Array(analyser.frequencyBinCount);

            analyser.smoothingTimeConstant = opts.smoothing;
            analyser.fftSize = Math.pow(2, opts.fft);
            analyser.minDecibels = opts.minDecibels;
            analyser.getByteFrequencyData(data);

            // Clear + redraw canvas every frame
            canvasRef.current.width = WIDTH;
            canvasRef.current.height = HEIGHT;

            // Draw three channel layers
            path(ctx, 0, data);
            path(ctx, 1, data);
            path(ctx, 2, data);

            requestAnimationFrame(visualize);
        };

        /**
         * Connects microphone input to analyser and kicks off visualization
         */
        const start = () => {
            const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            setAnalyser(analyser);

            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                    const source = ctx.createMediaStreamSource(stream);
                    source.connect(analyser);
                    setTimeout(() => visualize(), 0.0025); // delay for initialization
                })
                .catch((err) => {
                    console.error('Microphone access error:', err);
                });
        };

        useImperativeHandle(ref, () => ({
            trigger: () => {
                if (!canvasRef.current) {
                    console.warn('Canvas is not available.');
                    return;
                }
                start(); // safely start if canvas exists
            }
        }));

        return (
            <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                className={className}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    height: `${HEIGHT}px`,
                    zIndex: 2,
                    ...style
                }}
            />
        );
    }
);

export default React.memo(NeurofloVisualizer);
