'use client'

import { useState, useEffect } from 'react';
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

interface MotionState {
    x: number | null;
    y: number | null;
    z: number | null;
}

const SenzoryPage = () => {
    const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null, gamma: null });
    const [acceleration, setAcceleration] = useState<MotionState>({ x: null, y: null, z: null });
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- PŘIDÁNO: Stav pro sledování úrovně vibrací ---
    const [vibrationLevel, setVibrationLevel] = useState(0);

    const requestPermission = async () => {
        const DeviceOrientationEvent = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    setPermissionGranted(true);
                } else {
                    setError('Přístup k senzorům byl zamítnut.');
                    setPermissionGranted(false);
                }
            } catch (err) {
                setError('Došlo k chybě při žádosti o povolení.');
                console.error(err);
            }
        } else {
            setPermissionGranted(true);
        }
    };

    useEffect(() => {
        if (!permissionGranted) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma,
            });

            // --- PŘIDÁNO: Logika pro vibrace ---
            if (navigator.vibrate && event.gamma !== null) {
                // Omezíme gamma na náš pracovní rozsah -45 až 0
                const clampedGamma = Math.max(-45, Math.min(0, event.gamma));

                // Převedeme gamma na úroveň intenzity 0-10 (0 = žádná, 10 = max)
                // Když je gamma -45, level = 0. Když je gamma 0, level = 10.
                const level = Math.round(((clampedGamma + 45) / 45) * 10);
                setVibrationLevel(level);

                // Pokud je úroveň 0 (nebo jsme mimo rozsah), vypneme vibrace
                if (level === 0 || event.gamma < -45) {
                    navigator.vibrate(0);
                } else {
                    // Jinak spustíme vibraci. Délka pulzu se zvyšuje s úrovní.
                    // Událost se spouští velmi rychle, takže stačí krátký pulz.
                    const pulseDuration = level * 15; // max 150ms pulz
                    navigator.vibrate(pulseDuration);
                }
            }
        };

        const handleMotion = (event: DeviceMotionEvent) => {
            setAcceleration({
                x: event.acceleration?.x ?? null,
                y: event.acceleration?.y ?? null,
                z: event.acceleration?.z ?? null,
            });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('devicemotion', handleMotion);
            // Při opuštění stránky pro jistotu vypneme vibrace
            if (navigator.vibrate) {
                navigator.vibrate(0);
            }
        };
    }, [permissionGranted]);

    const format = (value: number | null) => value?.toFixed(2) ?? '--';

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Data ze senzorů (Next.js)</h1>
                {!permissionGranted ? (
                    <div>
                        <p>Pro zobrazení dat je potřeba povolit přístup k senzorům pohybu.</p>
                        <button onClick={requestPermission} className={styles.button}>
                            Povolit přístup
                        </button>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                ) : (
                    <div className={styles.dataDisplay}>
                        {/* --- PŘIDÁNO: Zobrazení úrovně vibrací --- */}
                        <h2>Vibrace (Akcelerace)</h2>
                        <div className={styles.dataGrid}>
                            <strong>Úroveň (0-10):</strong> <span>{vibrationLevel}</span>
                        </div>

                        <h2>Orientace (Gyroskop)</h2>
                        <div className={styles.dataGrid}>
                            <strong>Alpha (otáčení):</strong> <span>{format(orientation.alpha)}</span>
                            <strong>Beta (předklon):</strong> <span>{format(orientation.beta)}</span>
                            <strong>Gamma (úklon):</strong> <span className={styles.highlight}>{format(orientation.gamma)}</span>
                        </div>

                        <h2>Akcelerace</h2>
                        <div className={styles.dataGrid}>
                            <strong>Osa X:</strong> <span>{format(acceleration.x)}</span>
                            <strong>Osa Y:</strong> <span>{format(acceleration.y)}</span>
                            <strong>Osa Z:</strong> <span>{format(acceleration.z)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SenzoryPage;