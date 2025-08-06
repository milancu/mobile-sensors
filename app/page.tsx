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

const Page = () => {
    const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null, gamma: null });
    const [acceleration, setAcceleration] = useState<MotionState>({ x: null, y: null, z: null });
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            if (navigator.vibrate && event.gamma !== null) {
                const activeRange = 60.0;
                const clampedGamma = Math.max(-activeRange, Math.min(0, event.gamma));

                // Krok 1: Normalizujeme intenzitu na 0-1 jako předtím
                const normalizedIntensity = (clampedGamma + activeRange) / activeRange;

                // ZÁSADNÍ ZMĚNA 1: Aplikujeme exponenciální křivku pro dramatičtější zrychlení
                // Umocněním na třetí bude nárůst zpočátku pomalý a na konci velmi rychlý.
                const easedIntensity = Math.pow(normalizedIntensity, 3);

                // Pro zobrazení stále používáme původní lineární hodnotu pro lepší přehlednost
                setVibrationLevel(Math.round(normalizedIntensity * 10));

                if (event.gamma < -activeRange || event.gamma > 0) {
                    navigator.vibrate(0);
                } else {
                    // ZÁSADNÍ ZMĚNA 2: Silnější a plynulejší vibrace
                    // Zvýšíme celkovou délku cyklu, aby pulzy byly delší a silnější.
                    const totalCycleTime = 400; // ms (bylo 100)

                    // Zvýšíme minimální sílu, aby motor "běžel" citelněji i na volnoběh.
                    const minVibrationOn = 50; // ms (bylo 10)

                    // Vypočítáme délku vibrace na základě nové exponenciální intenzity
                    const onDuration = minVibrationOn + ((totalCycleTime - minVibrationOn) * easedIntensity);

                    // Pauzu mezi vibracemi nastavíme na velmi malou hodnotu pro pocit kontinuity.
                    const offDuration = 10; // ms

                    navigator.vibrate([onDuration, offDuration]);
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

export default Page;