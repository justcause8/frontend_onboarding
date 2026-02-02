import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { AdaptationPage, CoursePage, CoursesPage, EditAdaptationPage } from "./pages";
import MainLayout from './layout/mainLayout/MainLayout';
import EditLayout from './layout/editLayout/EditLayout';
import { PageTitleProvider  } from './contexts/PageTitleContext';

export const App = () => {
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <PageTitleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<AdaptationPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/course/:courseId" element={<CoursePage />} />
          </Route>

          <Route element={<EditLayout />}>
            <Route path="/edit" element={<EditAdaptationPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PageTitleProvider>
  );
};


export default App;