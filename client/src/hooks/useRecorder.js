import { useCallback, useEffect, useRef, useState } from 'react';

export function useRecorder(maxSeconds = 90) {
    const [state, setState] = useState('idle');
    const [blob, setBlob] = useState(null);
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState('');
    const [volumeCv, setVolumeCv] = useState(null);

    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const meterTimerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const volumeSamplesRef = useRef([]);
    const discardRef = useRef(false);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopVolumeMonitoring = useCallback(() => {
        if (meterTimerRef.current !== null) {
            window.clearInterval(meterTimerRef.current);
            meterTimerRef.current = null;
        }

        try {
            sourceRef.current?.disconnect();
            analyserRef.current?.disconnect();
        } catch {
            // Cleanup should not interrupt stopping or discarding a recording.
        }

        sourceRef.current = null;
        analyserRef.current = null;

        const context = audioContextRef.current;
        audioContextRef.current = null;

        if (context && context.state !== 'closed') {
            context.close().catch(() => {});
        }
    }, []);

    const stopTracks = useCallback(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }, []);

    const calculateVolumeCv = useCallback(() => {
        const samples = volumeSamplesRef.current;
        volumeSamplesRef.current = [];

        // Too few active-speech samples: omit the optional metric.
        if (samples.length < 5) return null;

        const mean = samples.reduce((sum, value) => sum + value, 0) /
            samples.length;

        if (!Number.isFinite(mean) || mean <= 0) return null;

        const variance = samples.reduce(
            (sum, value) => sum + (value - mean) ** 2,
            0
        ) / samples.length;

        const coefficient = Math.sqrt(variance) / mean;

        // Keep the value within the server's accepted range.
        return Number(Math.min(10, coefficient).toFixed(4));
    }, []);

    const stop = useCallback(() => {
        clearTimer();

        const recorder = recorderRef.current;
        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }
    }, [clearTimer]);

    const reset = useCallback(() => {
        discardRef.current = true;
        clearTimer();
        stopVolumeMonitoring();

        const recorder = recorderRef.current;

        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }

        stopTracks();

        recorderRef.current = null;
        chunksRef.current = [];
        volumeSamplesRef.current = [];

        setBlob(null);
        setSeconds(0);
        setError('');
        setVolumeCv(null);
        setState('idle');
    }, [clearTimer, stopTracks, stopVolumeMonitoring]);

    const start = useCallback(async () => {
        setError('');

        if (state === 'recording') return;

        if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === 'undefined'
        ) {
            setError('Audio recording is not supported in this browser. Try a recent version of Chrome, Edge, or Safari.');
            return;
        }

        try {
            discardRef.current = false;
            chunksRef.current = [];
            volumeSamplesRef.current = [];

            setBlob(null);
            setVolumeCv(null);
            setSeconds(0);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            streamRef.current = stream;

            // Monitor relative microphone-level variation. Recording still
            // works if AudioContext is unavailable in a browser.
            try {
                const AudioContextConstructor =
                    window.AudioContext || window.webkitAudioContext;

                if (AudioContextConstructor) {
                    const context = new AudioContextConstructor();
                    audioContextRef.current = context;

                    await context.resume();

                    const source = context.createMediaStreamSource(stream);
                    const analyser = context.createAnalyser();
                    analyser.fftSize = 512;

                    source.connect(analyser);

                    sourceRef.current = source;
                    analyserRef.current = analyser;

                    const samples = new Float32Array(analyser.fftSize);

                    meterTimerRef.current = window.setInterval(() => {
                        const activeAnalyser = analyserRef.current;
                        if (!activeAnalyser) return;

                        activeAnalyser.getFloatTimeDomainData(samples);

                        let squareSum = 0;

                        for (const sample of samples) {
                            squareSum += sample * sample;
                        }

                        const rms = Math.sqrt(squareSum / samples.length);

                        // Exclude near-silence so the CV reflects active
                        // microphone-level samples rather than idle room noise.
                        if (Number.isFinite(rms) && rms > 0.004) {
                            volumeSamplesRef.current.push(rms);
                        }
                    }, 100);
                }
            } catch {
                stopVolumeMonitoring();
                volumeSamplesRef.current = [];
            }

            const candidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4'
            ];

            const preferredType = candidates.find(type =>
                typeof MediaRecorder.isTypeSupported !== 'function' ||
                MediaRecorder.isTypeSupported(type)
            );

            const recorder = preferredType
                ? new MediaRecorder(stream, { mimeType: preferredType })
                : new MediaRecorder(stream);

            recorderRef.current = recorder;

            recorder.ondataavailable = event => {
                if (event.data?.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onerror = () => {
                clearTimer();
                stopVolumeMonitoring();
                stopTracks();
                setError('Recording encountered an error. Please try again.');
                setState('idle');
            };

            recorder.onstop = () => {
                clearTimer();

                const measuredVolumeCv = calculateVolumeCv();
                setVolumeCv(measuredVolumeCv);

                stopVolumeMonitoring();
                stopTracks();

                if (discardRef.current) {
                    discardRef.current = false;
                    setBlob(null);
                    setVolumeCv(null);
                    setState('idle');
                    return;
                }

                const actualType = recorder.mimeType ||
                    chunksRef.current[0]?.type ||
                    'audio/webm';

                const recording = new Blob(chunksRef.current, {
                    type: actualType
                });

                chunksRef.current = [];

                if (!recording.size) {
                    setError('No audio was captured. Check your microphone and try again.');
                    setState('idle');
                    return;
                }

                setBlob(recording);
                setState('done');
            };

            recorder.start(250);
            setState('recording');

            timerRef.current = window.setInterval(() => {
                setSeconds(previous => {
                    const next = previous + 1;

                    if (next >= maxSeconds) {
                        const active = recorderRef.current;

                        if (active?.state === 'recording') {
                            active.stop();
                        }

                        return maxSeconds;
                    }

                    return next;
                });
            }, 1000);
        } catch (recordError) {
            clearTimer();
            stopVolumeMonitoring();
            stopTracks();

            if (
                recordError?.name === 'NotAllowedError' ||
                recordError?.name === 'PermissionDeniedError'
            ) {
                setError('Microphone permission was denied. Allow microphone access in your browser, then try again.');
            } else if (recordError?.name === 'NotFoundError') {
                setError('No microphone was found. Connect a microphone and try again.');
            } else {
                setError('Could not start recording. Check your microphone and try again.');
            }

            setState('idle');
        }
    }, [
        state,
        maxSeconds,
        clearTimer,
        stopTracks,
        stopVolumeMonitoring,
        calculateVolumeCv
    ]);

    useEffect(() => () => {
        clearTimer();
        stopVolumeMonitoring();

        const recorder = recorderRef.current;

        if (recorder && recorder.state === 'recording') {
            recorder.onstop = null;
            recorder.stop();
        }

        streamRef.current?.getTracks().forEach(track => track.stop());
    }, [clearTimer, stopVolumeMonitoring]);

    return {
        state,
        blob,
        seconds,
        error,
        volumeCv,
        start,
        stop,
        reset
    };
}
