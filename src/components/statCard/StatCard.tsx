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

export const StatCardsGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="stat-cards-grid">{children}</div>
);
