'use client'

import { useState, useEffect, useRef } from 'react';
import styles from './styles/Senzory.module.css';

// Typy zůstávají stejné
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

interface OrientationState {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
}

const Page = () => {
    const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null, gamma: null });
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vibrationLevel, setVibrationLevel] = useState(0);

    // KLÍČOVÁ ZMĚNA: Použijeme useRef pro ukládání poslední hodnoty gamma a ID animace.
    // useRef nezpůsobuje překreslení komponenty, což je pro naši smyčku ideální.
    const gammaRef = useRef<number>(0);
    const animationFrameId = useRef<number | null>(null);

    // Funkce pro povolení zůstává stejná
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

    // KLÍČOVÁ ZMĚNA: Tento useEffect se stará POUZE o čtení dat ze senzorů
    useEffect(() => {
        if (!permissionGranted) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma,
            });
            // Uložíme poslední hodnotu gamma do ref proměnné
            if (event.gamma !== null) {
                gammaRef.current = event.gamma;
            }
        };

        // Přidáme posluchač jen pro orientaci
        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [permissionGranted]);


    // KLÍČOVÁ ZMĚNA: Tento useEffect se stará POUZE o spouštění a zastavení VIBRAČNÍ SMYČKY
    useEffect(() => {
        // Funkce, která se bude volat stále dokola
        const vibrationLoop = () => {
            // Přečteme si poslední známou hodnotu gamma z ref
            const currentGamma = gammaRef.current;

            // Zde je veškerá logika pro výpočet síly vibrací
            const activeRange = 60.0;
            const clampedGamma = Math.max(-activeRange, Math.min(0, currentGamma));
            const normalizedIntensity = (clampedGamma + activeRange) / activeRange;
            const easedIntensity = Math.pow(normalizedIntensity, 3);

            setVibrationLevel(Math.round(normalizedIntensity * 10));

            if (currentGamma < -activeRange || currentGamma > 0) {
                navigator.vibrate(0);
            } else {
                if(navigator.vibrate) {
                    const totalCycleTime = 400;
                    const minVibrationOn = 50;
                    const onDuration = minVibrationOn + ((totalCycleTime - minVibrationOn) * easedIntensity);
                    const offDuration = 10;
                    navigator.vibrate([onDuration, offDuration]);
                }
            }

            // Naplánujeme další spuštění této funkce
            animationFrameId.current = requestAnimationFrame(vibrationLoop);
        };

        if (permissionGranted) {
            // Spustíme smyčku
            animationFrameId.current = requestAnimationFrame(vibrationLoop);
        }

        // Cleanup funkce: Když komponenta zmizí, musíme smyčku zastavit!
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (navigator.vibrate) {
                navigator.vibrate(0); // Pro jistotu vypneme vibrace
            }
        };
    }, [permissionGranted]); // Smyčka se spustí/zastaví, když se změní stav povolení

    const format = (value: number | null) => value?.toFixed(2) ?? '--';

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Vibrace motoru</h1>
                {!permissionGranted ? (
                    <div>
                        <p>Pro simulaci motoru povolte prosím přístup k senzorům pohybu.</p>
                        <button onClick={requestPermission} className={styles.button}>
                            Povolit přístup
                        </button>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                ) : (
                    <div className={styles.dataDisplay}>
                        <h2>Síla motoru</h2>
                        <div className={styles.dataGrid}>
                            <strong>Úroveň (0-10):</strong> <span>{vibrationLevel}</span>
                        </div>

                        <h2>Orientace (pouze info)</h2>
                        <div className={styles.dataGrid}>
                            <strong>Gamma (úklon):</strong> <span className={styles.highlight}>{format(orientation.gamma)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;