import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { AdaptationPage, CoursePage, CoursesPage, PassingTestPage, MaterialsPage, EmployeesPage, ContactsPage, TotalReportsPage } from "./pages";
import { AdminAdaptationRoute, AdminEditAdaptationRoute, AdminCourses, AdminEditCourse, AdminTests, AdminEditTest, AdminEditMaterialsPage, AdminEditContactsPage, AdminEditUsersPage, AdminEditUserReportPage } from './pages';
import MainLayout from './layout/MainLayout';
import { PageTitleProvider } from './contexts/PageTitleContext';
import ProtectedRoute from './components/protectedRoute/ProtectedRoute';

export const App = () => {
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useBackgroundSync();

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
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            
            {/* Админские роуты */}
            <Route path="/edit/adaptationRoutes" element={<ProtectedRoute><AdminAdaptationRoute /></ProtectedRoute>} />
            <Route path="/edit/adaptationRoutes/:adaptationRouteId" element={<ProtectedRoute><AdminEditAdaptationRoute /></ProtectedRoute>} />
            <Route path="/edit/courses" element={<ProtectedRoute><AdminCourses /></ProtectedRoute>} />
            <Route path="/edit/courses/:courseId" element={<ProtectedRoute><AdminEditCourse /></ProtectedRoute>} />
            <Route path="edit/tests" element={<ProtectedRoute><AdminTests /></ProtectedRoute>} />
            <Route path="edit/tests/:testId" element={<ProtectedRoute><AdminEditTest /></ProtectedRoute>} />
            <Route path="edit/materials" element={<ProtectedRoute><AdminEditMaterialsPage /></ProtectedRoute>} />
            <Route path="edit/contacts" element={<ProtectedRoute><AdminEditContactsPage /></ProtectedRoute>} />
            <Route path="edit/users" element={<ProtectedRoute><AdminEditUsersPage /></ProtectedRoute>} />
            <Route path="/edit/total-reports" element={<ProtectedRoute><TotalReportsPage /></ProtectedRoute>} />
            <Route path="/edit/total-reports/:userId" element={<ProtectedRoute><AdminEditUserReportPage /></ProtectedRoute>} />

          </Route>
        </Routes>
      </BrowserRouter>
    </PageTitleProvider>
  );
};


export default App;