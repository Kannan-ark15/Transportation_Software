import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '../services/api';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [mode, setMode] = useState('login');
    const [formData, setFormData] = useState({ full_name: '', email: '', password: '', login_prefix: 'HOF' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setNotice('');

        try {
            setSubmitting(true);
            if (mode === 'register') {
                const res = await authAPI.register({
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    login_prefix: formData.login_prefix
                });
                if (res.success) {
                    setNotice('Account created successfully. Please sign in.');
                    setMode('login');
                    setFormData({ full_name: '', email: formData.email, password: '', login_prefix: formData.login_prefix || 'HOF' });
                }
            } else {
                const res = await authAPI.login({
                    email: formData.email,
                    password: formData.password,
                    login_prefix: formData.login_prefix
                });
                if (res.success) {
                    localStorage.setItem('auth_user', JSON.stringify(res.data));
                    navigate('/', { replace: true });
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#0b0d10] text-white">
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,60,74,0.85)_0%,_rgba(12,13,16,1)_55%,_rgba(7,8,10,1)_100%)]" />
                <div className="absolute left-1/2 top-16 h-56 w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-[90px]" />
                <div className="absolute -left-24 bottom-10 h-[260px] w-[260px] rounded-full bg-white/10 blur-[90px]" />
                <div className="absolute -right-20 bottom-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-400/15 blur-[120px]" />
                <div className="absolute inset-x-0 bottom-24 mx-auto h-28 w-[90%] max-w-5xl bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.14)_0%,_rgba(255,255,255,0)_65%)] opacity-40" />
                <div className="absolute inset-0 bg-[linear-gradient(110deg,_rgba(255,255,255,0.06)_0%,_rgba(255,255,255,0)_45%)]" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
                <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white/10 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-10">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/55">Welcome back</p>
                        <h1 className="text-3xl font-semibold text-white">
                            {mode === 'register' ? 'Create Account' : 'Sign In'}
                        </h1>
                        <p className="text-sm text-white/55">
                            {mode === 'register'
                                ? 'Create your account to access the transport system.'
                                : 'Access your transport operations dashboard.'}
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </div>
                        )}
                        {notice && (
                            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                                {notice}
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80" htmlFor="full_name">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                                    <Input
                                        id="full_name"
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Enter your name"
                                        value={formData.full_name}
                                        onChange={handleChange('full_name')}
                                        className="h-12 rounded-2xl border-white/15 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus-visible:ring-emerald-400/60"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80" htmlFor="email">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                    className="h-12 rounded-2xl border-white/15 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus-visible:ring-emerald-400/60"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80" htmlFor="login_prefix">
                                Login Branch
                            </label>
                            <Select
                                value={formData.login_prefix}
                                onValueChange={(val) => setFormData((prev) => ({ ...prev, login_prefix: val }))}
                            >
                                <SelectTrigger
                                    id="login_prefix"
                                    className="h-12 rounded-2xl border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-emerald-400/60"
                                >
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ARY">Ariyalur (ARY)</SelectItem>
                                    <SelectItem value="PND">Alathiyur (PND)</SelectItem>
                                    <SelectItem value="HOF">Head Office (HOF)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange('password')}
                                    className="h-12 rounded-2xl border-white/15 bg-white/5 pl-11 pr-12 text-sm text-white placeholder:text-white/40 focus-visible:ring-emerald-400/60"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {mode === 'login' && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 text-white/60">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border border-white/30 bg-white/10 text-emerald-400 focus-visible:ring-emerald-400/70"
                                    />
                                    Remember me
                                </label>
                                <a className="text-white/60 transition hover:text-white" href="#">
                                    Forgot password?
                                </a>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 py-3 text-base font-semibold text-slate-900 shadow-[0_12px_35px_rgba(16,185,129,0.45)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                        >
                            {submitting ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between text-sm text-white/50">
                        {mode === 'register' ? (
                            <>
                                <span>Already have an account?</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('login');
                                        setError('');
                                        setNotice('');
                                    }}
                                    className="text-white/70 transition hover:text-white"
                                >
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <>
                                <span>Need access?</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('register');
                                        setError('');
                                        setNotice('');
                                    }}
                                    className="text-white/70 transition hover:text-white"
                                >
                                    Create account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
