// pages/senzory.tsx

import { useState, useEffect } from 'react';
import styles from '../styles/Senzory.module.css'; // Styly si vytvoříme v dalším kroku

// Definujeme typy pro data ze senzorů pro lepší type-safety
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
    // Stav pro ukládání dat z orientačních senzorů
    const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null, gamma: null });
    // Stav pro ukládání dat z akcelerometru
    const [acceleration, setAcceleration] = useState<MotionState>({ x: null, y: null, z: null });
    // Stav pro sledování, zda uživatel udělil povolení
    const [permissionGranted, setPermissionGranted] = useState(false);
    // Stav pro zobrazení případných chyb
    const [error, setError] = useState<string | null>(null);

    // Funkce pro vyžádání povolení od uživatele
    const requestPermission = async () => {
        // Kód specifický pro iOS 13+
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceOrientationEvent as any).requestPermission();
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
            // Pro Android a ostatní zařízení, která nevyžadují explicitní žádost
            setPermissionGranted(true);
        }
    };

    // useEffect se postará o přidání a odebrání posluchačů událostí
    useEffect(() => {
        // Pokud nemáme povolení, nic neděláme
        if (!permissionGranted) return;

        // Funkce, která se zavolá při změně orientace
        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma,
            });
        };

        // Funkce, která se zavolá při změně pohybu
        const handleMotion = (event: DeviceMotionEvent) => {
            setAcceleration({
                x: event.acceleration?.x ?? null,
                y: event.acceleration?.y ?? null,
                z: event.acceleration?.z ?? null,
            });
        };

        // Přidáme posluchače
        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);

        // Klíčová část: Cleanup funkce. Odebere posluchače, když komponenta zmizí.
        // Tím se zabrání memory leakům.
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [permissionGranted]); // Tento effect se spustí znovu, pouze pokud se změní `permissionGranted`

    // Funkce pro formátování čísel, aby se nevypisovala s mnoha des. místy
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

export default SenzoryPage;