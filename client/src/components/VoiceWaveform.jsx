const barHeights = [
    18, 30, 22, 40, 25, 48, 34, 20, 42, 28,
    52, 32, 18, 39, 26, 46, 30, 20, 37, 25,
    44, 28, 18, 35, 24, 42, 29, 20, 34, 23
];

export default function VoiceWaveform({ active = false }) {
    return (
        <div
            className="flex h-16 items-center justify-center gap-1 overflow-hidden rounded-xl bg-slate-950 px-4"
            role="img"
            aria-label={active ? 'Animated waveform while recording' : 'Audio waveform preview'}
        >
            {barHeights.map((height, index) => (
                <span
                    key={index}
                    className={`w-1.5 shrink-0 rounded-full bg-gradient-to-t from-indigo-400 to-cyan-300 ${
                        active ? 'animate-pulse' : ''
                    }`}
                    style={{
                        height: `${height}%`,
                        animationDelay: `${(index % 8) * 80}ms`,
                        opacity: active ? 1 : 0.65
                    }}
                />
            ))}
        </div>
    );
}
