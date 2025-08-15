import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

// Components
import Navbar from './components/Navbar';

// Page components
import Login from './pages/Login';
import TastingForm from './pages/TastingForm';
import Posts from './pages/Posts';
import Events from './pages/Events';

// Main application component with routing
export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Listen for authentication changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <Navbar user={user} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/posts" /> : <Login />} />
        <Route path="/tasting" element={user ? <TastingForm /> : <Navigate to="/login" />} />
        <Route path="/posts" element={user ? <Posts /> : <Navigate to="/login" />} />
        <Route path="/events" element={user ? <Events /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? '/posts' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
