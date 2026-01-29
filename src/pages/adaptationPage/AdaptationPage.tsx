import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdaptationPage.css';
import { adaptationService } from '../../services/adaptationRoute.service';
import type { OnboardingRoute, UserProgress } from '../../services/adaptationRoute.service';

const emptyProgress: UserProgress = {
  totalCourses: 0,
  completedCourses: 0,
  totalStages: 0,
  completedStages: 0,
  stageProgress: [],
};

const AdaptationPage = () => {
  const navigate = useNavigate();

  const [route, setRoute] = useState<OnboardingRoute | null>(null);
  const [progress, setProgress] = useState<UserProgress>(emptyProgress);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    try {
      const routeId = await adaptationService.getMyRouteId();

      if (!routeId) {
        setRoute(null);
        setProgress(emptyProgress);
        return;
      }

      const [progressData, routeData] = await Promise.all([
        adaptationService.getUserProgress(),
        adaptationService.getRoute(routeId),
      ]);

      setProgress(progressData);
      setRoute(routeData);
    } catch (e) {
      console.error('Ошибка загрузки адаптации', e);
      setProgress(emptyProgress);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartStage = async (stageId: number) => {
    if (!route) return;

    const stage = route.stages.find(s => s.id === stageId);
    if (!stage || stage.courses.length === 0) {
      alert('В этапе нет курсов');
      return;
    }

    const firstCourse = [...stage.courses].sort(
      (a, b) => a.orderIndex - b.orderIndex
    )[0];

    await adaptationService.startCourse(firstCourse.id);
    await adaptationService.recalcStatuses();
    await loadData();

    navigate(`/course/${firstCourse.id}`);
  };

  const getStageStatus = (stageId: number) => {
    return (
      progress.stageProgress.find(s => s.stageId === stageId)?.status ??
      'current'
    );
  };

  if (loading) {
    return <div className="main-content">Загрузка...</div>;
  }
  // console.log(loading);
  
  const percent =
    progress.totalCourses > 0
      ? Math.round(
          (progress.completedCourses / progress.totalCourses) * 100
        )
      : 0;

  const percentStages =
    progress.totalStages > 0
      ? Math.round(
          (progress.completedStages / progress.totalStages) * 100
        )
      : 0;

  return (
    <div className="dashboard-container">
      <main className="main-content">
        {/* прогресс */}
        <section className="card progress-card">
          <h2>Ваш общий прогресс</h2>
          <div className="adaptation-page">
            <div className="progress-items">
              <div className="progress-item">
                <div className="progress-circle">{percentStages}%</div>
                <div>
                  Этапы: {progress.completedStages} /{' '}
                  {progress.totalStages}
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-circle">{percent}%</div>
                <div>
                  Курсы: {progress.completedCourses} /{' '}
                  {progress.totalCourses}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* этапы */}
        {route ? (
          <section className="card plan-card">
            <h2>Этапы маршрута</h2>

            {route.stages
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map(stage => {
                const status = getStageStatus(stage.id);

                return (
                  <div key={stage.id} className={`step ${status}`}>
                    <div className="step-content">
                      <h4>{stage.title}</h4>
                      <p>{stage.description}</p>

                      {status !== 'completed' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleStartStage(stage.id)}
                        >
                          {status === 'failed'
                            ? 'Продолжить'
                            : 'Начать'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </section>
        ) : (
          <section className="card">
            <h2>Маршрут не назначен</h2>
            <p>Обратитесь к HR или ментору.</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdaptationPage;


// РАБОЧИЕ СТИЛИ НО ВСЕ ОСТАЛЬНОЕ НЕ ТО

// import { useEffect, useState } from 'react';
// import Sidebar from '../../components/sidebar/Sidebar';
// import Header from '../../components/header/Header';
// import { api } from '../../api/api';
// import { useNavigate } from 'react-router-dom';
// import "../../../index.css";

// // Типы
// interface CourseShort {
//   id: number;
//   title: string;
//   orderIndex: number;
//   status?: string;
// }

// interface StageProgressItem {
//   stageId: number;
//   status: 'completed' | 'failed' | 'current';
// }

// interface UserProgress {
//   totalCourses: number;
//   completedCourses: number;
//   totalStages: number;
//   completedStages: number;
//   stageProgress: StageProgressItem[];
// }

// interface Stage {
//   id: number;
//   title: string;
//   description: string; // Добавлено описание этапа
//   orderIndex: number;
//   courses: CourseShort[];
// }

// interface OnboardingRoute {
//   id: number;
//   title: string;
//   stages: Stage[];
// }

// const AdaptationPage = () => {
//   const navigate = useNavigate();
//   const [progress, setProgress] = useState<UserProgress>({
//     totalCourses: 0,
//     completedCourses: 0,
//     totalStages: 0,
//     completedStages: 0,
//     stageProgress: [],
//   });
//   const [route, setRoute] = useState<OnboardingRoute | null>(null);
//   const [loading, setLoading] = useState(true);

//   // Функция для обновления данных
//   const loadData = async () => {
//     try {
//       const routeIdRes = await api.get<{ routeId: number | null }>('onboarding/route/my-route');
//       const routeId = routeIdRes.data.routeId;

//       if (routeId === null) {
//         setProgress({
//           totalCourses: 0,
//           completedCourses: 0,
//           totalStages: 0,
//           completedStages: 0,
//           stageProgress: [],
//         });
//         setRoute(null);
//         setLoading(false);
//         return;
//       }

//       // Загружаем прогресс с обычного эндпоинта
//       const progressRes = await api.get<UserProgress>('/onboarding/user-progress');
//       setProgress(progressRes.data);

//       const routeRes = await api.get<OnboardingRoute>(`/onboarding/route/${routeId}`);
//       setRoute(routeRes.data);
//     } catch (error) {
//       console.error('Ошибка загрузки данных адаптации:', error);
//       setProgress({
//         totalCourses: 0,
//         completedCourses: 0,
//         totalStages: 0,
//         completedStages: 0,
//         stageProgress: [],
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   const handleStartStage = async (stageId: number) => {
//     try {
//       const stage = route?.stages.find(s => s.id === stageId);
//       if (!stage || !stage.courses.length) {
//         alert('В этом этапе нет доступных курсов');
//         return;
//       }

//       // Сортируем и берем первый курс
//       const firstCourse = [...stage.courses].sort((a, b) => a.orderIndex - b.orderIndex)[0];
      
//       console.log('Начинаем курс:', firstCourse.title);

//       // Отправляем запрос на начало курса
//       const startResponse = await api.post(`/onboarding/course/${firstCourse.id}/start`);
      
//       if (startResponse.data.status === 'success' || startResponse.data.status === 'info') {
//         // Вызываем ручной пересчет статусов
//         try {
//           await api.post('/onboarding/recalculate-statuses');
//         } catch (recalcError) {
//           console.log('Пересчет статусов не требуется или недоступен:', recalcError);
//         }
        
//         // ПЕРЕЗАГРУЖАЕМ ДАННЫЕ ПОСЛЕ НАЧАЛА КУРСА
//         await loadData();
        
//         // Переходим на страницу курса
//         navigate(`/course/${firstCourse.id}`);
//       } else {
//         alert('Не удалось начать курс. Попробуйте еще раз.');
//       }
//     } catch (error) {
//       console.error('Ошибка начала этапа:', error);
//       alert('Произошла ошибка при начале этапа');
//     }
//   };

//   const getStageStatus = (stageId: number): 'completed' | 'failed' | 'current' => {
//     const item = progress.stageProgress.find(sp => sp.stageId === stageId);
//     return item ? item.status : 'current';
//   };

//   if (loading) {
//     return (
//       <div className="dashboard-container">
//         <Sidebar />
//         <main className="main-content">
//           <Header title="Ваш план адаптации" />
//           <p>Загрузка данных...</p>
//         </main>
//       </div>
//     );
//   }

//   const total = progress.totalCourses;
//   const completed = progress.completedCourses;
//   const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
//   const percentStages = progress.totalStages > 0 
//     ? Math.round((progress.completedStages / progress.totalStages) * 100) 
//     : 0;

//   return (
//     <div className="dashboard-container">
//       <Sidebar />
//       <main className="main-content">
//         <Header title="Ваш план адаптации" />

//         {/* Прогресс */}
//         <section className="card progress-card">
//           <h2>Ваш общий прогресс</h2>
//           <div className="progress-items">
//             <div className="progress-item">
//               <div className="progress-circle">{percentStages}%</div>
//               <div className="progress-info">
//                 <h3>Пройдено этапов</h3>
//                 <p>{progress.completedStages} из {progress.totalStages}</p>
//               </div>
//             </div>
//             <div className="progress-item">
//               <div className="progress-circle">{percent}%</div>
//               <div className="progress-info">
//                 <h3>Пройдено курсов</h3>
//                 <p>{completed} из {total}</p>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Динамические этапы */}
//         {route ? (
//           <section className="card plan-card">
//             <h2>Этапы вашего маршрута</h2>
//             <div className="stepper">
//               {[...route.stages]
//                 .sort((a, b) => a.orderIndex - b.orderIndex)
//                 .map((stage) => {
//                   const status = getStageStatus(stage.id);
//                   let iconContent: string | number = stage.orderIndex;
//                   if (status === 'completed') iconContent = '✓';
//                   else if (status === 'failed') iconContent = '!';

//                   let statusText = '';
//                   if (status === 'completed') {
//                     statusText = 'Этап завершён';
//                   } else if (status === 'failed') {
//                     statusText = 'Этап начат, но не завершён. Продолжите обучение.';
//                   } else {
//                     statusText = 'Этап ещё не начат';
//                   }

//                   return (
//                     <div key={stage.id} className={`step ${status}`}>
//                       <div className="step-icon">
//                         {iconContent}
//                       </div>
//                       <div className="step-content">
//                         <h4>{stage.title}</h4>
                        
//                         {/* Описание этапа */}
//                         {stage.description && (
//                           <p className="stage-description">{stage.description}</p>
//                         )}
                        
//                         <p className="stage-info">
//                           {stage.courses.length} {stage.courses.length === 1 ? 'курс' : 
//                             stage.courses.length > 1 && stage.courses.length < 5 ? 'курса' : 'курсов'}
//                         </p>
                        
//                         <div className="courses-list">
//                           {stage.courses
//                             .sort((a, b) => a.orderIndex - b.orderIndex)
//                             .map((course) => (
//                               <div key={course.id} className="course-item">
//                                 <span className="course-title">{course.title}</span>
//                                 {course.status && (
//                                   <span className={`course-status ${course.status}`}>
//                                     {course.status === 'completed' ? '✓' : 
//                                      course.status === 'in_progress' ? '▶' : '○'}
//                                   </span>
//                                 )}
//                               </div>
//                             ))}
//                         </div>
                        
//                         <p className="stage-status">{statusText}</p>
//                       </div>
                      
//                       {status === 'current' && (
//                         <div className="step-actions">
//                           <button 
//                             className="btn btn-primary"
//                             onClick={() => handleStartStage(stage.id)}
//                           >
//                             Начать этап
//                           </button>
//                         </div>
//                       )}
                      
//                       {status === 'failed' && (
//                         <div className="step-actions">
//                           <button 
//                             className="btn btn-secondary"
//                             onClick={() => handleStartStage(stage.id)}
//                           >
//                             Продолжить этап
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//             </div>
//           </section>
//         ) : (
//           <section className="card plan-card">
//             <h2>Маршрут адаптации не назначен</h2>
//             <p>Обратитесь к HR-специалисту или ментору для назначения плана адаптации.</p>
//           </section>
//         )}
//       </main>
//     </div>
//   );
// };

// export default AdaptationPage;