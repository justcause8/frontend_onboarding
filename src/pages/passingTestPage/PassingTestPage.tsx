import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { courseService } from '../../services/coursePage.services';
import LoadingSpinner from '../../components/loading/LoadingSpinner';

const PassingTestPage = () => {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const { setDynamicTitle } = usePageTitle();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        const courseData = await courseService.getCourseById(Number(courseId));
        const currentTest = courseData.tests.find(t => t.id === Number(testId));
        
        if (currentTest) {
          setDynamicTitle(`${courseData.title} | ${currentTest.title}`);
        } else {
          setDynamicTitle(`${courseData.title} | Тест`);
        }
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        setDynamicTitle('Ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
    return () => setDynamicTitle('');
  }, [courseId, testId, setDynamicTitle]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card text">
      <h1>Прохождение теста</h1>
      {/* Контент теста */}
    </div>
  );
};

export default PassingTestPage;