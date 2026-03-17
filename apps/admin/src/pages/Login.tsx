import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function Login() {
    const { error: authError, isLoading, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate({ to: '/' });
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(124,109,244,0.08) 0%, var(--bg-base) 70%)',
            }}
        >
            <div className="w-full max-w-sm">
                <Card
                    className="border-border shadow-2xl"
                    style={{
                        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,109,244,0.08)',
                    }}
                >
                    <CardContent className="p-8">
                        {/* Header */}
                        <div className="flex flex-col items-center gap-3 mb-8">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #7c6df4 0%, #6366f1 100%)',
                                    boxShadow: '0 8px 24px rgba(124,109,244,0.35)',
                                }}
                            >
                                <Zap size={24} className="text-white" />
                            </div>
                            <div className="text-center">
                                <h1 className="text-xl font-semibold tracking-tight">
                                    ClawQuest Admin
                                </h1>
                                <p className="text-sm mt-0.5 text-muted-foreground">
                                    Restricted access only
                                </p>
                            </div>
                        </div>

                        {/* Error */}
                        {(error || authError) && (
                            <div
                                className="mb-5 p-3 rounded-lg text-sm bg-destructive/10 border border-destructive/25 text-destructive"
                            >
                                {error || authError}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                    style={{ letterSpacing: '0.07em' }}
                                >
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@clawquest.xyz"
                                    className="bg-secondary/50 border-border"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                    style={{ letterSpacing: '0.07em' }}
                                >
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="bg-secondary/50 border-border"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="btn-gradient w-full h-11 text-sm font-semibold"
                            >
                                {loading ? 'Signing in…' : 'Sign in →'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Bottom hint */}
                <p className="text-center text-xs mt-4 text-muted-foreground">
                    ClawQuest · Admin Panel
                </p>
            </div>
        </div>
    );
}
