import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import CharacterDetail from './pages/CharacterDetail';
import CharacterForm from './pages/CharacterForm';
import RecordForm from './pages/RecordForm';
import Rankings from './pages/Rankings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/characters/new" element={<CharacterForm />} />
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route path="/characters/:id/edit" element={<CharacterForm />} />
            <Route path="/records/new" element={<RecordForm />} />
            <Route path="/records/new/:characterId" element={<RecordForm />} />
            <Route path="/rankings" element={<Rankings />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
