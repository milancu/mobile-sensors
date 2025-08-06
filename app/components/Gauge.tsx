// app/components/Gauge.tsx
'use client'

import styles from '../styles/Gauge.module.css';

interface GaugeProps {
    level: number; // Hodnota 0-10
}

const Gauge: React.FC<GaugeProps> = ({ level }) => {
    // Převedeme úroveň 0-10 na úhel rotace ručičky (-135° až +135°)
    const maxAngle = 135;
    const rotation = (level / 10) * (maxAngle * 2) - maxAngle;

    const isRedline = level >= 9.5;

    return (
        <div className={styles.gaugeContainer}>
            <div className={styles.gauge}>
                <div className={styles.axis}>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                    <div className={styles.tick}></div>
                </div>
                <div
                    className={`${styles.needle} ${isRedline ? styles.needleRedline : ''}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                ></div>
                <div className={styles.needleCap}></div>
            </div>
            <div className={styles.levelDisplay}>{level}</div>
        </div>
    );
};

export default Gauge;