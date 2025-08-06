'use client'

import { useState, useEffect, useRef } from 'react';
import styles from './styles/Senzory.module.css';

// Typy pro TypeScript
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

const Page = () => {
    // Stavy pro řízení logiky
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vibrationLevel, setVibrationLevel] = useState(0);

    // NOVÝ STAV: Sledujeme, zda je tlačítko plynu stisknuté
    const [isGasPressed, setIsGasPressed] = useState(false);

    // Ref proměnné pro plynulost a výkon
    const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
    const animationFrameId = useRef<number | null>(null);
    // Ref pro stav plynu, aby smyčka měla vždy aktuální hodnotu
    const gasPressedRef = useRef(false);

    // Funkce pro vyžádání povolení
    const requestPermission = async () => {
        const DeviceOrientationEvent = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    setPermissionGranted(true);
                } else {
                    setError('Přístup k senzorům byl zamítnut.');
                }
            } catch (err) {
                console.error('Došlo k chybě při žádosti o povolení.', err);
                setError('Došlo k chybě při žádosti o povolení.');
            }
        } else {
            setPermissionGranted(true);
        }
    };

    // EFEKT 1: Pouze čte a ukládá data ze senzorů
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

    // EFEKT 2: Udržuje ref proměnnou synchronizovanou se stavem plynu
    useEffect(() => {
        gasPressedRef.current = isGasPressed;
    }, [isGasPressed]);

    // EFEKT 3: Hlavní smyčka pro vibrace
    useEffect(() => {
        const vibrationLoop = () => {
            // KLÍČOVÁ PODMÍNKA: Pokud není plyn stisknutý, vypneme vibrace a nic dalšího neděláme.
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

    // NOVÉ HANDLERY: Funkce pro ovládání tlačítka plynu
    const handleGasPress = () => setIsGasPressed(true);
    const handleGasRelease = () => setIsGasPressed(false);

    const format = (value: number | null) => value?.toFixed(2) ?? '--';

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Ovladač RC Auta</h1>
                {!permissionGranted ? (
                    <div>
                        <p>Pro ovládání povolte prosím přístup k senzorům pohybu.</p>
                        <button onClick={requestPermission} className={styles.button}>
                            Povolit přístup
                        </button>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                ) : (
                    <div className={styles.controlInterface}>
                        <div className={styles.infoDisplay}>
                            <strong>Úroveň plynu:</strong>
                            <span className={styles.levelText}>{vibrationLevel}</span>
                        </div>

                        {/* NOVÉ TLAČÍTKO: Tlačítko plynu s handlery pro stisk a puštění */}
                        <button
                            className={`${styles.gasButton} ${isGasPressed ? styles.gasButtonPressed : ''}`}
                            onMouseDown={handleGasPress}
                            onMouseUp={handleGasRelease}
                            onMouseLeave={handleGasRelease} // Pokud uživatel sjede myší z tlačítka
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