'use client';

import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        Kgl: any;
    }
}

interface OrbProps {
    color?: [number, number, number];
    size?: number;
    className?: string;
    maxAlpha?: number;
    minAlpha?: number;
    animationSpeed?: number;
    fullscreen?: boolean;
}

const ShaderOrb: React.FC<OrbProps> = ({
    color = [0, 40, 255],
    size = 10,
    className = 'flex items-center justify-center',
    maxAlpha = 0.82,
    minAlpha = 0.1,
    animationSpeed = 0.8,
    fullscreen = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const orbWrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Kgl) return;

        const particleOneSideNum = window.innerWidth < 768 ? 400 : 800;
        const bloomRadius = 1;
        const uv: number[] = [];
        const maxI = particleOneSideNum - 1;

        for (let j = 0; j < particleOneSideNum; j++) {
            for (let i = 0; i < particleOneSideNum; i++) {
                uv.push(i / maxI, 1 - j / maxI);
            }
        }

        const webgl = new window.Kgl({
            canvas: canvasRef.current,
            cameraPosition: [0, 0, Math.min(window.innerWidth, window.innerHeight)],
            programs: {
                main: {
                    vertexShader: `
                        attribute vec2 uv;
                        uniform mat4 mvpMatrix;
                        uniform vec2 resolution;
                        uniform float time;
                        varying vec2 vUv;
                        varying float vPositionZ;

                        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

                        float snoise(vec3 v) {
                            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                            vec3 i = floor(v + dot(v, C.yyy));
                            vec3 x0 = v - i + dot(i, C.xxx);
                            vec3 g = step(x0.yzx, x0.xyz);
                            vec3 l = 1.0 - g;
                            vec3 i1 = min(g.xyz, l.zxy);
                            vec3 i2 = max(g.xyz, l.zxy);
                            vec3 x1 = x0 - i1 + C.xxx;
                            vec3 x2 = x0 - i2 + C.yyy;
                            vec3 x3 = x0 - D.yyy;
                            i = mod289(i);
                            vec4 p = permute(permute(permute(
                                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                            float n_ = 0.142857142857;
                            vec3 ns = n_ * D.wyz - D.xzx;
                            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                            vec4 x_ = floor(j * ns.z);
                            vec4 y_ = floor(j - 7.0 * x_);
                            vec4 x = x_ * ns.x + ns.yyyy;
                            vec4 y = y_ * ns.x + ns.yyyy;
                            vec4 h = 1.0 - abs(x) - abs(y);
                            vec4 b0 = vec4(x.xy, y.xy);
                            vec4 b1 = vec4(x.zw, y.zw);
                            vec4 s0 = floor(b0)*2.0 + 1.0;
                            vec4 s1 = floor(b1)*2.0 + 1.0;
                            vec4 sh = -step(h, vec4(0.0));
                            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                            vec3 p0 = vec3(a0.xy,h.x);
                            vec3 p1 = vec3(a0.zw,h.y);
                            vec3 p2 = vec3(a1.xy,h.z);
                            vec3 p3 = vec3(a1.zw,h.w);
                            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                            p0 *= norm.x;
                            p1 *= norm.y;
                            p2 *= norm.z;
                            p3 *= norm.w;
                            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                            m = m * m;
                            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                        }

                        vec3 snoiseVec3(vec3 x) {
                            float s  = snoise(x);
                            float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
                            float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
                            return vec3(s, s1, s2);
                        }

                        vec3 curlNoise(vec3 p) {
                            const float e = .1;
                            vec3 dx = vec3(e, 0.0, 0.0);
                            vec3 dy = vec3(0.0, e, 0.0);
                            vec3 dz = vec3(0.0, 0.0, e);
                            vec3 p_x0 = snoiseVec3(p - dx);
                            vec3 p_x1 = snoiseVec3(p + dx);
                            vec3 p_y0 = snoiseVec3(p - dy);
                            vec3 p_y1 = snoiseVec3(p + dy);
                            vec3 p_z0 = snoiseVec3(p - dz);
                            vec3 p_z1 = snoiseVec3(p + dz);
                            float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
                            float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
                            float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
                            return normalize(vec3(x, y, z) * (1.0 / (2.0 * e)));
                        }

                        const float speed = 0.2;
                        const float density = 0.8;
                        const float size = 0.34;

                        void main() {
                            vUv = uv;
                            vec2 cUv = (uv * 2.0) - 1.0;
                            vec3 position = vec3(cUv, 0.0) + time * speed;
                            vec3 noise = curlNoise(position * density);
                            position = noise * min(resolution.x, resolution.y) * size;
                            vPositionZ = noise.z;
                            gl_Position = mvpMatrix * vec4(position, 0.9);
                        }
                    `,
                    fragmentShader: `
                        precision highp float;
                        uniform float time;
                        varying vec2 vUv;
                        varying float vPositionZ;

                        const vec3 color = vec3(${color[0] / 255}, ${color[1] / 255}, ${color[2] / 255});
                        const float maxAlpha = ${maxAlpha};
                        const float minAlpha = ${minAlpha};
                        const float speed = ${animationSpeed};

                        void main() {
                            float alpha = mix(minAlpha, maxAlpha, (sin(vUv.x * 6.28318530718 + time * speed) + 1.0) * 0.5);
                            alpha *= mix(0.5, 1.0, vPositionZ);
                            gl_FragColor = vec4(color, alpha);
                        }
                    `,
                    attributes: {
                        uv: { value: uv, size: 2 }
                    },
                    uniforms: {
                        time: 0
                    },
                    mode: 'LINE_STRIP',
                    isTransparent: true
                }
            },
            effects: ['bloom'],
            framebuffers: ['main', 'cache', 'output'],
            onBefore: () => {},
            tick: (time: number) => {
                webgl.bindFramebuffer('main');
                webgl.programs['main'].draw({ time });
                webgl.effects['bloom'].draw('main', 'cache', 'output', bloomRadius);
                webgl.unbindFramebuffer();
                webgl.programs['main'].draw({ texture: 'output' });
            }
        });

        // Mic visualization
        const setupMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new AudioContext();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const input = audioContext.createMediaStreamSource(stream);
                input.connect(analyser);
                const freqs = new Uint8Array(analyser.frequencyBinCount);

                const animate = () => {
                    requestAnimationFrame(animate);
                    analyser.getByteFrequencyData(freqs);
                    const avg = freqs.reduce((sum, v) => sum + v, 0) / freqs.length;
                    const scale = Math.min(2, 1 + avg / 150);
                    if (orbWrapRef.current) {
                        orbWrapRef.current.style.transform = `scale(${scale})`;
                    }
                };
                animate();
            } catch (err) {
                console.error('Microphone error:', err);
            }
        };

        setupMic();
    }, [color, size, maxAlpha, minAlpha, animationSpeed]);

    return (
        <div className={`${fullscreen ? 'flex items-center justify-center' : ''} ${className}`}>
            <div ref={orbWrapRef} style={{ width: size, height: size }} className='relative'>
                <canvas ref={canvasRef} className='pointer-events-none absolute left-0 top-0 mx-0 my-0' />
            </div>
        </div>
    );
};

export default ShaderOrb;
