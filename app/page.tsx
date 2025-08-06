'use client'

import { useState, useEffect } from 'react';
import styles from '../styles/Senzory.module.css';

// --- OPRAVA: KROK 1 ---
// Vytvoříme si vlastní typ, který rozšiřuje standardní DeviceOrientationEvent
// o metodu requestPermission, specifickou pro iOS.
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

// Původní typy pro stav zůstávají stejné
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

    const requestPermission = async () => {
        // --- OPRAVA: KROK 2 ---
        // Použijeme náš nový typ místo `any`.
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
                        <h2>Orientace (Gyroskop)</h2>
                        <div className={styles.dataGrid}>
                            <strong>Alpha (otáčení):</strong> <span>{format(orientation.alpha)}</span>
                            <strong>Beta (předklon):</strong> <span>{format(orientation.beta)}</span>
                            <strong>Gamma (úklon):</strong> <span>{format(orientation.gamma)}</span>
                        </div>

                        <h2>Akcelerace (bez gravitace)</h2>
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