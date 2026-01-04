import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role || 'admin');
      localStorage.setItem('username', username);
      setShowSplash(true);
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Get splash screen content based on username
  const getSplashContent = () => {
    if (username === 'dzikri123') {
      return {
        letters: [
          { char: 'H', className: 'h' },
          { char: 'A', className: 'a' },
          { char: 'L', className: 'l' },
          { char: 'O', className: 'o' },
          { char: ' ', className: 'space' },
          { char: 'B', className: 'b' },
          { char: 'O', className: 'o2' },
          { char: 'S', className: 's' },
          { char: ' ', className: 'space2' },
          { char: 'D', className: 'd' },
          { char: 'Z', className: 'z' },
          { char: 'I', className: 'i' },
          { char: 'K', className: 'k' },
          { char: 'R', className: 'r' },
          { char: 'I', className: 'i2' },
        ],
        subtext: '~* SeManGaT bOzZ dZiKrI *~',
        emojis: { top: '👑💎✨', bottom: '🚀💰🔥' }
      };
    }
    // Default for admin and others
    return {
      letters: [
        { char: 'H', className: 'h' },
        { char: 'A', className: 'a' },
        { char: 'L', className: 'l' },
        { char: 'O', className: 'o' },
        { char: ' ', className: 'space' },
        { char: 'Y', className: 'y' },
        { char: 'O', className: 'o2' },
        { char: 'L', className: 'l2' },
      ],
      subtext: '~* SaBaR yAaA bOzZ *~',
      emojis: { top: '🔥💯✨', bottom: '💎🚀🌟' }
    };
  };

  if (showSplash) {
    const splashContent = getSplashContent();
    
    // Special 3D Excavator splash for dzikri123
    if (username === 'dzikri123') {
      return (
        <div className="excavator-splash">
          {/* 3D Scene Container */}
          <div className="scene-3d">
            {/* Sky Background */}
            <div className="sky">
              <div className="sun"></div>
              <div className="cloud cloud-1"></div>
              <div className="cloud cloud-2"></div>
              <div className="cloud cloud-3"></div>
            </div>
            
            {/* Ground / Sand Area */}
            <div className="ground">
              <div className="sand-texture"></div>
              <div className="sand-pile"></div>
              <div className="sand-pile pile-2"></div>
              <div className="sand-pile pile-3"></div>
            </div>

            {/* 3D Excavator */}
            <div className="excavator">
              {/* Tracks */}
              <div className="excavator-tracks">
                <div className="track track-left">
                  <div className="track-wheel"></div>
                  <div className="track-wheel wheel-back"></div>
                  <div className="track-belt"></div>
                </div>
                <div className="track track-right">
                  <div className="track-wheel"></div>
                  <div className="track-wheel wheel-back"></div>
                  <div className="track-belt"></div>
                </div>
              </div>
              
              {/* Body */}
              <div className="excavator-body">
                <div className="body-main">
                  <div className="body-front"></div>
                  <div className="body-top"></div>
                  <div className="body-side"></div>
                </div>
                <div className="cabin">
                  <div className="cabin-window"></div>
                  <div className="cabin-roof"></div>
                </div>
                <div className="exhaust">
                  <div className="smoke smoke-1"></div>
                  <div className="smoke smoke-2"></div>
                  <div className="smoke smoke-3"></div>
                </div>
              </div>
              
              {/* Arm */}
              <div className="excavator-arm">
                <div className="arm-boom">
                  <div className="hydraulic"></div>
                </div>
                <div className="arm-stick">
                  <div className="hydraulic stick-hydraulic"></div>
                </div>
                <div className="bucket">
                  <div className="bucket-teeth"></div>
                  <div className="sand-in-bucket"></div>
                </div>
              </div>
            </div>

            {/* Falling Sand Particles */}
            <div className="falling-sand">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className="sand-particle" 
                  style={{ 
                    '--delay': `${i * 0.15}s`, 
                    '--x': `${50 + (Math.random() - 0.5) * 30}%`,
                    '--size': `${3 + Math.random() * 5}px`
                  }} 
                />
              ))}
            </div>
          </div>

          {/* Text Overlay */}
          <div className="excavator-splash-text">
            <h1 className="excavator-title">
              <span className="title-line">HALO BOS</span>
              <span className="title-name">DZIKRI</span>
            </h1>
            <p className="excavator-subtitle">PT. DZIKRY MULTI LABA</p>
          </div>

          {/* Loading Bar */}
          <div className="excavator-loading">
            <div className="loading-track">
              <div className="loading-progress"></div>
            </div>
            <span className="loading-text">Memuat sistem...</span>
          </div>
        </div>
      );
    }
    
    // Default splash for other users
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-emoji">{splashContent.emojis.top}</div>
          <h1 className="splash-text">
            {splashContent.letters.map((letter, idx) => (
              <span key={idx} className={`letter ${letter.className}`}>
                {letter.char === ' ' ? '\u00A0' : letter.char}
              </span>
            ))}
          </h1>
          <div className="splash-emoji bottom">{splashContent.emojis.bottom}</div>
          <div className="splash-loading">
            <div className="loading-bar"></div>
          </div>
          <p className="splash-subtext">{splashContent.subtext}</p>
        </div>
        <div className="splash-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{ '--delay': `${i * 0.2}s`, '--x': `${Math.random() * 100}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="login-bg">
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
        <div className="floating-shapes">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`shape shape-${i + 1}`} />
          ))}
        </div>
      </div>

      <div className="login-wrapper">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="logo-text">
                <span className="logo-company">PT. DZIKRY MULTI LABA</span>
                <span className="logo-tagline">Sand Mining Excellence</span>
              </div>
            </div>
            
            <div className="brand-hero">
              <h2>Kelola Bisnis Pasir Anda dengan Mudah</h2>
              <p>
                Sistem manajemen keuangan terpadu untuk operasional pertambangan pasir. 
                Pantau pemasukan, pengeluaran, hutang, dan keuntungan dalam satu platform.
              </p>
            </div>

            <div className="brand-features">
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div className="feature-text">
                  <span className="feature-title">Analisis Real-time</span>
                  <span className="feature-desc">Pantau revenue harian, mingguan, bulanan</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🚛</div>
                <div className="feature-text">
                  <span className="feature-title">Manajemen Rit</span>
                  <span className="feature-desc">Hitung otomatis pasir ayak & lempung</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">💰</div>
                <div className="feature-text">
                  <span className="feature-title">Potongan Otomatis</span>
                  <span className="feature-desc">Loading, market, broker tercatat rapi</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="brand-footer">
            © 2024 PT. DZIKRY MULTI LABA. All rights reserved.
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="form-container">
            {/* Mobile Logo */}
            <div className="mobile-logo">
              <div className="logo-icon-mobile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="mobile-company">PT. DZIKRY MULTI LABA</span>
            </div>

            <div className="form-card">
              <div className="form-header">
                <h1>Selamat Datang</h1>
                <p>Masuk ke akun Anda untuk melanjutkan</p>
              </div>

              {error && (
                <div className="error-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                  <label htmlFor="username">Username</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      id="password"
                      type="password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? (
                    <span className="btn-loading">
                      <svg className="spinner" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    <>
                      Masuk
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="security-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Dilindungi dengan standar keamanan industri
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
