// components/AudioWaveIcon.tsx
export default function AudioWaveIcon() {
    const heights = [0.9, 0.9, 0.9,0.9,0.9]; // Start off same size

    return (
        <div className='flex h-6 w-6 items-end gap-[3px]'>
            {heights.map((scale, i) => (
                <span
                    key={i}
                    className='animate-wavebar w-[2px] bg-current rounded'
                    style={{
                        height: `${scale * 100}%`,
                        animationDelay: `${i * 0.15}s`,
                        transformOrigin: 'center'
                    }}
                />
            ))} 
{/* // small → medium → large → medium → small */}
            <style jsx>{`
                @keyframes wavebar {
                    0%,
                    100% {
                        transform: scaleY(0.5);
                    }
                    50% {
                        transform: scaleY(1.2);
                    }
                }

                .animate-wavebar {
                    animation: wavebar 1.2s infinite ease-in-out;
                    display: inline-block;
                }
            `}</style>
        </div>
    );
}
