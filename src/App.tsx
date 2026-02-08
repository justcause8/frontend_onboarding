import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUserStore } from './store/useUserStore';
import { AdaptationPage, CoursePage, CoursesPage, PassingTestPage, EditAdaptationPage, PageAdapt, TrainingCourses, TrainingCoursesEdit, TestPage, TestPageEdit } from "./pages";
import MainLayout from './layout/mainLayout/MainLayout';
import EditLayout from './layout/editLayout/EditLayout';
import { PageTitleProvider } from './contexts/PageTitleContext';
import { AdminLayout } from './pages/adminPanel/MenuAdmin/AdminLayout';

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
            <Route path="/courses/course/:courseId/test/:testId" element={<PassingTestPage />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<PageAdapt />} />
              <Route path="/edit" element={<EditAdaptationPage />} />
              <Route path="/training" element={<TrainingCourses />} />
              <Route path="/trainingEdit" element={<TrainingCoursesEdit />} />
              <Route path="/testPage" element={<TestPage />} />
              <Route path="/testPageEdit" element={<TestPageEdit />} />
            </Route>

          </Route>

          <Route element={<EditLayout />}>
            {/* <Route path="/edit" element={<EditAdaptationPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </PageTitleProvider>
  );
};


export default App;