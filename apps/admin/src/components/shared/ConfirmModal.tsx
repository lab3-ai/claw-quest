import { type ReactNode } from 'react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    description?: string;
    children?: ReactNode;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open, title, description, children, confirmLabel = 'Confirm',
    confirmVariant = 'primary', loading, onConfirm, onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    const btnCls = confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-indigo-600 hover:bg-indigo-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative rounded-lg p-6 w-full max-w-md"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                {description && <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
                {children}
                <div className="flex gap-3 justify-end mt-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded text-sm"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded text-sm text-white ${btnCls} disabled:opacity-50`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
