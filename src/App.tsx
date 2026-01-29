import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { AdaptationPage, CoursePage, CoursesPage, EditAdaptationPage } from "./pages";
import MainLayout from './layout/mainLayout/MainLayout';
import EditLayout from './layout/editLayout/EditLayout';

export const App = () => {
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<AdaptationPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
        </Route>

        <Route element={<EditLayout />}>
          <Route path="/edit" element={<EditAdaptationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};


export default App;