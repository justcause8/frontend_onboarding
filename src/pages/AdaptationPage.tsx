import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { api } from '../api/api';

// Типы
interface StageProgressItem {
  stageId: number;
  status: 'completed' | 'failed' | 'current';
}

interface UserProgress {
  totalCourses: number;
  completedCourses: number;
  totalStages: number;
  completedStages: number;
  stageProgress: StageProgressItem[]; // ← обязательно!
}

interface CourseShort {
  id: number;
  title: string;
  orderIndex: number;
}

interface AssignedEmployee {
  id: number;
  name: string;
  status: string;
}

interface Stage {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  courses: CourseShort[];
  assignedEmployees: AssignedEmployee[];
}

interface OnboardingRoute {
  id: number;
  title: string;
  description: string;
  stages: Stage[];
}

const AdaptationPage = () => {
  // Прогресс — инициализируем с stageProgress!
  const [progress, setProgress] = useState<UserProgress>({
    totalCourses: 0,
    completedCourses: 0,
    totalStages: 0,
    completedStages: 0,
    stageProgress: [], // ← добавлено
  });

  const [route, setRoute] = useState<OnboardingRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const routeIdRes = await api.get<{ routeId: number | null }>('/onboarding/my-route');
        const routeId = routeIdRes.data.routeId;

        if (routeId === null) {
          // Убедитесь, что структура соответствует типу!
          setProgress({
            totalCourses: 0,
            completedCourses: 0,
            totalStages: 0,
            completedStages: 0,
            stageProgress: [], // ← обязательно
          });
          setRoute(null);
          setLoading(false);
          return;
        }

        const progressRes = await api.get<UserProgress>('/onboarding/course/user-progress');
        setProgress(progressRes.data);

        const routeRes = await api.get<OnboardingRoute>(`/onboarding/route/${routeId}`);
        setRoute(routeRes.data);
      } catch (error) {
        console.error('Ошибка загрузки данных адаптации:', error);
        // На случай ошибки — тоже соблюдаем тип
        setProgress({
          totalCourses: 0,
          completedCourses: 0,
          totalStages: 0,
          completedStages: 0,
          stageProgress: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Header title="Мой план адаптации" />
          <p>Загрузка данных...</p>
        </main>
      </div>
    );
  }

  const total = progress.totalCourses;
  const completed = progress.completedCourses;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const percentStages = progress.totalStages > 0 
    ? Math.round((progress.completedStages / progress.totalStages) * 100) 
    : 0;

  const getStageStatus = (stageId: number): 'completed' | 'failed' | 'current' => {
    const item = progress.stageProgress.find(sp => sp.stageId === stageId);
    return item ? item.status : 'current';
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Header title="Мой план адаптации" />

        {/* Прогресс */}
        <section className="card progress-card">
          <h2>Ваш общий прогресс</h2>
          <div className="progress-items">
            <div className="progress-item">
              <div className="progress-circle">{percentStages}%</div>
              <div className="progress-info">
                <h3>Пройдено этапов</h3>
                <p>{progress.completedStages} из {progress.totalStages}</p>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-circle">{percent}%</div>
              <div className="progress-info">
                <h3>Пройдено курсов</h3>
                <p>{completed} из {total}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Динамические этапы */}
        {route ? (
          <section className="card plan-card">
            <h2>Этапы вашего маршрута</h2>
            <div className="stepper">
              {[...route.stages]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage) => {
                  const status = getStageStatus(stage.id);
                  let iconContent: string | number = stage.orderIndex;
                  if (status === 'completed') iconContent = '✓';
                  else if (status === 'failed') iconContent = '!';

                  let description = '';
                  if (status === 'completed') {
                    description = 'Этап завершён';
                  } else if (status === 'failed') {
                    description = 'Этап начат, но не завершён. Продолжите обучение.';
                  } else {
                    description = 'Этап ещё не начат';
                  }

                  return (
                    <div key={stage.id} className={`step ${status}`}>
                      <div className="step-icon">
                        {iconContent}
                      </div>
                      <div className="step-content">
                        <h4>{stage.title}</h4>
                        <p>{description}</p>
                      </div>
                      {status === 'current' && (
                        <div className="step-actions">
                          <button className="btn btn-primary">Начать этап</button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ) : (
          <section className="card plan-card">
            <h2>Маршрут адаптации не назначен</h2>
            <p>Обратитесь к HR-специалисту или ментору для назначения плана адаптации.</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdaptationPage;