/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                surface: {
                    DEFAULT: 'var(--surface)',
                    dark: 'var(--surface-dark)',
                    light: 'var(--surface-light)',
                    lighter: 'var(--surface-lighter)',
                    muted: 'var(--surface-muted)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    tertiary: 'var(--text-tertiary)',
                },
                border: {
                    DEFAULT: 'var(--border-color)',
                    subtle: 'var(--border-subtle)',
                },
                glass: {
                    bg: 'var(--glass-bg)',
                    border: 'var(--glass-border)',
                },
                accent: {
                    emerald: 'var(--accent-emerald)',
                    amber: 'var(--accent-amber)',
                    rose: 'var(--accent-rose)',
                    sky: 'var(--accent-sky)',
                },
            },
            boxShadow: {
                'premium-sm': 'var(--shadow-sm)',
                'premium': 'var(--shadow-md)',
                'premium-lg': 'var(--shadow-lg)',
                'premium-xl': 'var(--shadow-xl)',
                'glow': 'var(--shadow-glow)',
                'card': 'var(--shadow-card)',
                'glow-brand': '0 0 30px rgba(99, 102, 241, 0.2), 0 0 60px rgba(99, 102, 241, 0.08)',
                'glow-emerald': '0 0 20px rgba(52, 211, 153, 0.2)',
                'glow-amber': '0 0 20px rgba(251, 191, 36, 0.2)',
                'glow-rose': '0 0 20px rgba(251, 113, 133, 0.2)',
            },
            backdropBlur: {
                premium: 'var(--backdrop-blur)',
                xs: '2px',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'fade-in': {
                    from: { opacity: 0, transform: 'translateY(8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                'slide-in-right': {
                    from: { opacity: 0, transform: 'translateX(24px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                },
                'scale-in': {
                    from: { opacity: 0, transform: 'scale(0.92)' },
                    to: { opacity: 1, transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            animation: {
                shimmer: 'shimmer 1.5s infinite',
                'fade-in': 'fade-in 0.4s ease-out forwards',
                'slide-in-right': 'slide-in-right 0.35s ease-out forwards',
                'scale-in': 'scale-in 0.3s ease-out forwards',
                float: 'float 6s ease-in-out infinite',
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '30': '7.5rem',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            transitionTimingFunction: {
                'premium': 'cubic-bezier(0.23, 1, 0.32, 1)',
                'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
        },
    },
    plugins: [],
}
