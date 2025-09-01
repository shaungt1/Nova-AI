'use client';

import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        SineWaves: any;
    }
}

interface SineWaveProps {
    colorStops?: [string, string, string]; // Color stops for gradient
    width?: number; // Optional fixed width
    height?: number; // Height of the canvas
    className?: string; // TailwindCSS/custom classes
    speedMultiplier?: number; // Speed boost for audio-reactive waves (default 1)
    glow?: boolean; // Enable glow
    glowColor?: string; // Custom shadow color
    glowBlur?: number; // How strong the blur glow is
    audioReactive?: boolean; // Reacts to mic audio
    animateGradient?: boolean; // Moves gradient along X
    jitter?: boolean; // Enables shimmer effect
    jitterIntensity?: number; // How much jitter per frame (1–10)
    amplitudeSensitivity?: number; // How strong amplitude grows with voice (default 1)
}

const SineWave: React.FC<SineWaveProps> = ({
    colorStops = ['rgba(25, 200, 255, 0)', 'rgba(0, 55, 180, 0.75)', 'rgba(5, 195, 250, 0)'],
    width,
    height = 200,
    className = '',
    speedMultiplier = 1,
    glow = true,
    glowColor = 'rgba(0,120,255,0.5)',
    glowBlur = 20,
    audioReactive = true,
    animateGradient = true,
    jitter = true,
    jitterIntensity = 2,
    amplitudeSensitivity = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const wavesRef = useRef<any>(null);
    const freqsRef = useRef<Uint8Array | null>(null);
    const gradientOffset = useRef<number>(0);

    useEffect(() => {
        if (!window.SineWaves || !canvasRef.current) return;

        const waves = new window.SineWaves({
            el: canvasRef.current,
            speed: 5,
            ease: 'SineInOut',
            wavesWidth: '65%',
            responsive: true,
            waves: [
                { timeModifier: 4, lineWidth: 1, amplitude: -25, wavelength: 25 },
                { timeModifier: 2, lineWidth: 1, amplitude: -10, wavelength: 30 },
                { timeModifier: 1, lineWidth: 1, amplitude: -30, wavelength: 30 },
                { timeModifier: 3, lineWidth: 1, amplitude: 40, wavelength: 40 },
                { timeModifier: 0.5, lineWidth: 1, amplitude: -60, wavelength: 60 },
                { timeModifier: 1.3, lineWidth: 1, amplitude: -40, wavelength: 40 }
            ],
            resizeEvent: function () {
                if (!this.ctx) return;

                const updateGradient = () => {
                    gradientOffset.current += 1;
                    const grad = this.ctx.createLinearGradient(
                        gradientOffset.current % this.width,
                        0,
                        this.width + (gradientOffset.current % this.width),
                        0
                    );
                    grad.addColorStop(0, colorStops[0]);
                    grad.addColorStop(0.5, colorStops[1]);
                    grad.addColorStop(1, colorStops[2]);

                    if (glow) {
                        this.ctx.shadowBlur = glowBlur;
                        this.ctx.shadowColor = glowColor;
                    } else {
                        this.ctx.shadowBlur = 0;
                        this.ctx.shadowColor = 'transparent';
                    }

                    this.waves.forEach((wave: any) => {
                        wave.strokeStyle = grad;
                    });
                };

                updateGradient();

                if (animateGradient) {
                    const animate = () => {
                        updateGradient();
                        requestAnimationFrame(animate);
                    };
                    animate();
                }
            }
        });

        wavesRef.current = waves;

        const setupAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const input = audioContext.createMediaStreamSource(stream);
                input.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                freqsRef.current = new Uint8Array(analyser.frequencyBinCount);

                requestAnimationFrame(visualize);
            } catch (error) {
                console.error('Microphone access error:', error);
            }
        };

        const visualize = () => {
            if (!analyserRef.current || !wavesRef.current || !freqsRef.current) return;
             //@ts-ignore
            analyserRef.current.getByteFrequencyData(freqsRef.current);
            const avg = freqsRef.current.reduce((sum, v) => sum + v, 0) / freqsRef.current.length;

            if (audioReactive) {
                const mappedSpeed = Math.max(2, avg / 6) * speedMultiplier;
                const mappedWidth = Math.min(100, 50 + avg);

                wavesRef.current.speed = mappedSpeed;
                wavesRef.current.wavesWidth = `${mappedWidth}%`;

                wavesRef.current.waves.forEach((wave: any, i: number) => {
                    const voiceAmp = (avg / 5) * amplitudeSensitivity;
                    wave.amplitude = wave.amplitude + voiceAmp * Math.sin(i); // vary based on wave index
                });
            }

            if (jitter) {
                wavesRef.current.waves.forEach((wave: any) => {
                    wave.amplitude += (Math.random() - 0.5) * jitterIntensity;
                });
            }

            requestAnimationFrame(visualize);
        };

        if (audioReactive) setupAudio();
    }, [
        colorStops,
        speedMultiplier,
        glow,
        glowColor,
        glowBlur,
        audioReactive,
        animateGradient,
        jitter,
        jitterIntensity,
        amplitudeSensitivity
    ]);

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 z-10 overflow-hidden ${className}`}
            style={{
                width: width ? `${width}px` : '100%',
                height: `${height}px`
            }}>
            <canvas ref={canvasRef} className='pointer-events-none h-full w-full' />
        </div>
    );
};

export default SineWave;
