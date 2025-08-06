'use client'

import { useState, useEffect, useRef } from 'react';
import styles from './styles/Senzory.module.css';
import Gauge from './components/Gauge'; // Importujeme novou komponentu

// Typy pro lepší kontrolu v TypeScriptu
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

const Page = () => {
    // Stavy pro řízení logiky a zobrazení
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vibrationLevel, setVibrationLevel] = useState(0);
    const [isBraking, setIsBraking] = useState(false);
    const [isColliding, setIsColliding] = useState(false);

    // Ref proměnné pro ukládání dat ze senzorů bez zbytečného překreslování
    const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
    const lastMotionRef = useRef({ x: 0, y: 0, z: 0, timestamp: 0 });
    const animationFrameId = useRef<number | null>(null);

    // Funkce pro vyžádání povolení od uživatele
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
                console.error('Došlo k chybě při žádosti o povolení.', err);
                setError('Došlo k chybě při žádosti o povolení.');
            }
        } else {
            // Pro zařízení, která nevyžadují explicitní povolení (např. Android)
            setPermissionGranted(true);
        }
    };

    // EFEKT 1: Připojení a odpojení senzorů
    useEffect(() => {
        if (!permissionGranted) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            orientationRef.current = {
                alpha: event.alpha ?? 0,
                beta: event.beta ?? 0,
                gamma: event.gamma ?? 0,
            };
        };

        const handleMotion = (event: DeviceMotionEvent) => {
            if (!event.acceleration) return;
            const { x, y, z } = event.acceleration;
            const now = Date.now();
            const last = lastMotionRef.current;
            const timeDiff = now - last.timestamp;

            if (timeDiff > 100) { // Zpracováváme otřesy jen každých 100ms pro efektivitu
                const deltaX = (x ?? 0) - last.x;
                const deltaY = (y ?? 0) - last.y;
                const deltaZ = (z ?? 0) - last.z;
                // Vypočítáme "jerk" - rychlost změny akcelerace
                const jerk = Math.sqrt(deltaX**2 + deltaY**2 + deltaZ**2) / (timeDiff / 1000);

                // Detekce nárazu (hodnotu 300 možná bude potřeba vyladit)
                if (jerk > 300) {
                    setIsColliding(true);
                    if (navigator.vibrate) navigator.vibrate(200); // Krátká, silná vibrace nárazu
                    setTimeout(() => setIsColliding(false), 200); // Vypnutí vizuálního efektu
                }
                lastMotionRef.current = { x: x ?? 0, y: y ?? 0, z: z ?? 0, timestamp: now };
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [permissionGranted]);

    // EFEKT 2: Hlavní smyčka pro vibrace a logiku hry
// Nahraďte tento useEffect ve vašem souboru app/page.tsx

// EFEKT 2: Hlavní smyčka pro vibrace a logiku hry
    useEffect(() => {
        const vibrationLoop = () => {
            const { beta, gamma } = orientationRef.current;

            // Logika brzdy - má nejvyšší prioritu
            const newBrakingState = beta > 35;
            setIsBraking(newBrakingState);
            if (newBrakingState) {
                if (navigator.vibrate) navigator.vibrate(0);
                setVibrationLevel(0);
                animationFrameId.current = requestAnimationFrame(vibrationLoop);
                return;
            }

            // Logika motoru
            const activeRange = 60.0;
            const clampedGamma = Math.max(-activeRange, Math.min(0, gamma));
            const normalizedIntensity = (clampedGamma + activeRange) / activeRange;
            setVibrationLevel(Math.round(normalizedIntensity * 10));

            if (gamma < -activeRange || gamma > 0) {
                if (navigator.vibrate) navigator.vibrate(0);
            } else {
                if(navigator.vibrate) {

                    // ZÁSADNÍ ZMĚNA ZDE: Dva odlišené režimy
                    const afterburnerThreshold = -15.0; // Hranice pro přepnutí na silnější režim

                    if (gamma > afterburnerThreshold) {
                        // REŽIM 2: "FORSÁŽ" - Agresivní, rychlé a krátké pulzy
                        // Tento vzor působí velmi intenzivně a "chraplavě".
                        navigator.vibrate([25, 15, 25, 15, 25, 15]);
                    } else {
                        // REŽIM 1: BĚŽNÝ MOTOR - Plynulý a silný "hukot"
                        const easedIntensity = Math.pow(normalizedIntensity, 3);
                        const totalCycleTime = 400;
                        const minVibrationOn = 50;
                        const onDuration = minVibrationOn + ((totalCycleTime - minVibrationOn) * easedIntensity);
                        const offDuration = 10;
                        navigator.vibrate([onDuration, offDuration]);
                    }
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

    return (
        <div className={`${styles.container} ${isColliding ? styles.collisionFlash : ''}`}>
            <div className={styles.card}>
                <h1>Palubní deska</h1>
                {!permissionGranted ? (
                    <div>
                        <p>Pro simulaci jízdy povolte prosím přístup k senzorům pohybu.</p>
                        <button onClick={requestPermission} className={styles.button}>
                            Povolit přístup
                        </button>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                ) : (
                    <div className={styles.dataDisplay}>
                        {isBraking && <div className={styles.brakeIndicator}>BRZDA</div>}

                        <Gauge level={vibrationLevel} />

                        <div className={styles.dataGridInfo}>
                            <span>Gamma: {orientationRef.current.gamma.toFixed(1)}°</span>
                            <span>Beta: {orientationRef.current.beta.toFixed(1)}°</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;