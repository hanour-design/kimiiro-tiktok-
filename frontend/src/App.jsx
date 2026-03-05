import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import CharacterDetail from './pages/CharacterDetail';
import CharacterForm from './pages/CharacterForm';
import RecordForm from './pages/RecordForm';
import Rankings from './pages/Rankings';
import { isConfigured } from './api';
import './App.css';

function RequireSetup({ children }) {
  if (!isConfigured()) {
    return <div style={{padding:'2rem',textAlign:'center'}}>APIのURLが設定されていません。</div>;
  }
  return children;
}

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<RequireSetup><Dashboard /></RequireSetup>} />
            <Route path="/characters/new" element={<RequireSetup><CharacterForm /></RequireSetup>} />
            <Route path="/characters/:id" element={<RequireSetup><CharacterDetail /></RequireSetup>} />
            <Route path="/characters/:id/edit" element={<RequireSetup><CharacterForm /></RequireSetup>} />
            <Route path="/records/new" element={<RequireSetup><RecordForm /></RequireSetup>} />
            <Route path="/records/new/:characterId" element={<RequireSetup><RecordForm /></RequireSetup>} />
            <Route path="/rankings" element={<RequireSetup><Rankings /></RequireSetup>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;
