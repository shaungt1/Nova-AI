import React, { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';

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
}

export interface NeurofloVisualizerHandle {
    trigger: () => void;
}

const NeurofloVisualizer = forwardRef<NeurofloVisualizerHandle, Props>(
    ({ options = {}, className = '', style, isActive = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
        const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

        // Static width, but dynamic height via props
        const WIDTH = 1000;
        const HEIGHT = options.height || 120;

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

        useEffect(() => {
            if (isActive) {
                startVisualizer();
            } else {
                stopVisualizer();
            }
        }, [isActive]);

        const startVisualizer = () => {
            if (audioContext || analyser) return; // Prevent multiple initializations

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = Math.pow(2, opts.fft);
            analyserNode.smoothingTimeConstant = opts.smoothing;
            analyserNode.minDecibels = opts.minDecibels;

            setAudioContext(ctx);
            setAnalyser(analyserNode);

            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                    const source = ctx.createMediaStreamSource(stream);
                    source.connect(analyserNode);
                    visualize(analyserNode);
                })
                .catch((err) => {
                    console.error('Microphone access error:', err);
                });
        };

        const stopVisualizer = () => {
            if (audioContext) {
                audioContext.close();
                setAudioContext(null);
                setAnalyser(null);
            }
        };

        const visualize = (analyserNode: AnalyserNode) => {
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

            const renderFrame = () => {
                if (!analyserNode || !canvasRef.current) return;

                analyserNode.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                const width = canvasRef.current.width;
                const height = canvasRef.current.height;
                const barWidth = (width / dataArray.length) * 2.5;
                let x = 0;

                dataArray.forEach((value) => {
                    const barHeight = (value / 255) * height;
                    ctx.fillStyle = `rgb(${opts.color1[0]}, ${opts.color1[1]}, ${opts.color1[2]})`;
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                });

                requestAnimationFrame(renderFrame);
            };

            renderFrame();
        };

        useImperativeHandle(ref, () => ({
            trigger: () => {
                if (isActive) {
                    startVisualizer();
                }
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
