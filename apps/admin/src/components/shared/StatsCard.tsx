import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    sub?: string;
    color?: string;
    accentColor?: string;
}

export function StatsCard({ label, value, icon, sub, color = 'text-violet-400', accentColor }: StatsCardProps) {
    return (
        <Card
            className="stats-card"
            style={accentColor ? { borderColor: `${accentColor}30` } : undefined}
        >
            <CardContent className="p-5 flex flex-col gap-3">
                {/* Icon + label */}
                <div className="flex items-center justify-between">
                    <span
                        className="text-xs font-medium uppercase"
                        style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                    >
                        {label}
                    </span>
                    {icon && (
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
                            style={{ background: accentColor ? `${accentColor}18` : 'var(--bg-tertiary)' }}
                        >
                            {icon}
                        </div>
                    )}
                </div>

                {/* Value */}
                <div
                    className="text-3xl font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)', lineHeight: 1 }}
                >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>

                {/* Sub */}
                {sub && (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {sub}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
