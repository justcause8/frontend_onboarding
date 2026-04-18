import React from 'react';
import './StatCard.css';

interface StatCardProps {
    value: string | number;
    label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => (
    <div className="stat-card">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
    </div>
);

export const StatDonutCard: React.FC<StatCardProps> = ({ value, label }) => {
    const numeric = parseFloat(String(value));
    const p = isNaN(numeric) ? 0 : Math.min(Math.max(numeric, 0), 100);
    return (
        <div className="stat-donut-box">
            <div className="stat-donut" style={{ '--p': p } as React.CSSProperties}>
                <span>{value}</span>
            </div>
            <span className="stat-donut-label">{label}</span>
        </div>
    );
};

export const StatCardsGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="stat-cards-grid">{children}</div>
);
