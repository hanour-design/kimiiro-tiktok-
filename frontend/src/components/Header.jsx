import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="logo-mark">K</span>
          <div className="logo-text">
            <span className="logo-title">キミイロ</span>
            <span className="logo-subtitle">TikTok成長ダッシュボード</span>
          </div>
        </Link>
        <nav className="header-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            ダッシュボード
          </Link>
          <Link to="/rankings" className={`nav-link ${location.pathname === '/rankings' ? 'active' : ''}`}>
            ランキング
          </Link>
          <Link to="/characters/new" className={`nav-link ${location.pathname === '/characters/new' ? 'active' : ''}`}>
            キャラ登録
          </Link>
          <Link to="/records/new" className={`nav-link ${location.pathname.startsWith('/records') ? 'active' : ''}`}>
            記録入力
          </Link>
        </nav>
      </div>
    </header>
  );
}
