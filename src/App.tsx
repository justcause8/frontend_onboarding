import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { AdaptationPage, CoursePage, CoursesPage, PassingTestPage, MaterialsPage } from "./pages";
import { AdminAdaptationRoute, AdminEditAdaptationRoute, AdminCourses, AdminEditCourse, AdminTests, AdminEditTest, AdminEditMaterialsPage } from './pages';
import MainLayout from './layout/MainLayout';
import { PageTitleProvider } from './contexts/PageTitleContext';

export const App = () => {
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <PageTitleProvider>
      <BrowserRouter>
        <Routes>
          {/* Публичные/Пользовательские роуты */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<AdaptationPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/course/:courseId" element={<CoursePage />} />
            <Route path="/courses/course/:courseId/test/:testId" element={<PassingTestPage />} />
            <Route path="/materials/" element={<MaterialsPage />} />

            
            {/* Админские роуты */}
            <Route path="/edit/adaptationRoutes" element={<AdminAdaptationRoute />} />
            <Route path="/edit/adaptationRoutes/:adaptationRouteId" element={<AdminEditAdaptationRoute />} />
            <Route path="/edit/courses" element={<AdminCourses />} />
            <Route path="/edit/courses/:courseId" element={<AdminEditCourse />} />
            <Route path="edit/tests" element={<AdminTests />} />
            <Route path="edit/tests/:testId" element={<AdminEditTest />} />
            <Route path="edit/materials" element={<AdminEditMaterialsPage />} />
            
            {/* <Route path="edit/users" element={< />} />
            <Route path="edit/requests" element={< />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </PageTitleProvider>
  );
};


export default App;