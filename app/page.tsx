'use client'

import { useState, useEffect, useRef } from 'react';
import styles from './styles/Senzory.module.css';

// Typy pro TypeScript
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

// --- ZDE JE FINÁLNÍ OPRAVA ---
// Rozšiřujeme globální typ, abychom předešli konfliktu.
declare global {
    interface ScreenOrientation {
        lock(orientation: 'landscape'): Promise<void>;
    }
}

const Page = () => {
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vibrationLevel, setVibrationLevel] = useState(0);
    const [isGasPressed, setIsGasPressed] = useState(false);

    const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
    const animationFrameId = useRef<number | null>(null);
    const gasPressedRef = useRef(false);

    const requestPermission = async () => {
        // Část pro povolení senzorů
        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    setPermissionGranted(true);
                } else {
                    setError('Přístup k senzorům byl zamítnut.');
                    return;
                }
            } else {
                setPermissionGranted(true);
            }
        } catch (err) {
            console.error('Chyba při žádosti o povolení senzorů:', err);
            setError('Došlo k chybě při žádosti o povolení senzorů.');
            return;
        }

        // Část pro fullscreen a zamknutí orientace
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }

            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }

        } catch (err) {
            console.error("Zamknutí orientace nebo fullscreen se nezdařilo:", err);
        }
    };

    // EFEKT 1: Čtení dat ze senzorů
    useEffect(() => {
        if (!permissionGranted) return;
        const handleOrientation = (event: DeviceOrientationEvent) => {
            orientationRef.current = {
                alpha: event.alpha ?? 0,
                beta: event.beta ?? 0,
                gamma: event.gamma ?? 0,
            };
        };
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [permissionGranted]);

    // EFEKT 2: Synchronizace stavu plynu s ref proměnnou
    useEffect(() => {
        gasPressedRef.current = isGasPressed;
    }, [isGasPressed]);

    // EFEKT 3: Hlavní smyčka pro vibrace
    useEffect(() => {
        const vibrationLoop = () => {
            if (!gasPressedRef.current) {
                if (navigator.vibrate) navigator.vibrate(0);
                setVibrationLevel(0);
                animationFrameId.current = requestAnimationFrame(vibrationLoop);
                return;
            }
            const { gamma } = orientationRef.current;
            const activeRange = 60.0;
            const clampedGamma = Math.max(-activeRange, Math.min(0, gamma));
            const normalizedIntensity = (clampedGamma + activeRange) / activeRange;
            const easedIntensity = Math.pow(normalizedIntensity, 3);
            setVibrationLevel(Math.round(normalizedIntensity * 10));
            if (gamma < -activeRange || gamma > 0) {
                if (navigator.vibrate) navigator.vibrate(0);
            } else {
                if(navigator.vibrate) {
                    const totalCycleTime = 400;
                    const minVibrationOn = 50;
                    const onDuration = minVibrationOn + ((totalCycleTime - minVibrationOn) * easedIntensity);
                    const offDuration = 10;
                    navigator.vibrate([onDuration, offDuration]);
                }
            }
            animationFrameId.current = requestAnimationFrame(vibrationLoop);
        };
        if (permissionGranted) {
            animationFrameId.current = requestAnimationFrame(vibrationLoop);
        }
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            if (navigator.vibrate) navigator.vibrate(0);
        };
    }, [permissionGranted]);

    // Handlery pro tlačítko plynu
    const handleGasPress = () => setIsGasPressed(true);
    const handleGasRelease = () => setIsGasPressed(false);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Ovladač RC Auta</h1>
                {!permissionGranted ? (
                    <div>
                        <p>Pro ovládání povolte prosím přístup k senzorům pohybu.</p>
                        <p style={{fontSize: '0.8em', color: '#888'}}>Po stisknutí se stránka přepne na celou obrazovku a otočí na šířku.</p>
                        <button onClick={requestPermission} className={styles.button}>
                            Start & Povolit přístup
                        </button>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                ) : (
                    <div className={styles.controlInterface}>
                        <div className={styles.infoDisplay}>
                            <strong>Úroveň plynu:</strong>
                            <span className={styles.levelText}>{vibrationLevel}</span>
                        </div>
                        <button
                            className={`${styles.gasButton} ${isGasPressed ? styles.gasButtonPressed : ''}`}
                            onMouseDown={handleGasPress}
                            onMouseUp={handleGasRelease}
                            onMouseLeave={handleGasRelease} // Pro případ, že uživatel sjede myší z tlačítka
                            onTouchStart={handleGasPress}
                            onTouchEnd={handleGasRelease}
                        >
                            Plyn
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;