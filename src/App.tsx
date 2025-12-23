import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import AdaptationPage from './pages/AdaptationPage';
import CoursesPage from './pages/CoursesPage';
import CoursePage from './pages/CoursePage';

function App() {
  const fetchUser = useUserStore((state) => state.fetchUser);
  const isLoading = useUserStore((state) => state.isLoading);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Загрузка системы...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdaptationPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;