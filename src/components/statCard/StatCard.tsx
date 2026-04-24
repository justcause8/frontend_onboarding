import React from 'react';
import './StatCard.css';

interface StatCardProps {
    value: string | number;
    label: string;
    sublabel?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => (
    <div className="stat-card">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
    </div>
);

export const StatDonutCard: React.FC<StatCardProps> = ({ value, label, sublabel }) => {
    const numeric = parseFloat(String(value));
    const p = isNaN(numeric) ? 0 : Math.min(Math.max(numeric, 0), 100);
    return (
        <div className="stat-donut-box">
            <div className="stat-donut" style={{ '--p': p } as React.CSSProperties}>
                <span>{value}</span>
            </div>
            <span className="stat-donut-label">
                {label}
                {sublabel && <p className="stat-donut-sublabel">{sublabel}</p>}
            </span>
        </div>
    );
};

interface StatProgressCardProps {
    percent: number;
    label: string;
}

export const StatProgressCard: React.FC<StatProgressCardProps> = ({ percent, label }) => (
    <div className="stat-progress-block">
        <div className="stat-progress-row">
            <span className="stat-progress-percent">{percent} %</span>
            <div className="stat-progress-track">
                <div className="stat-progress-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
        <span className="stat-progress-label">{label}</span>
    </div>
);

export const StatCardsGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="stat-cards-grid">{children}</div>
);
