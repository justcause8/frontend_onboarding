import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

// Описываем тип для шага
interface Step {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'failed' | 'current';
  date?: string;
  icon: string;
}

const steps: Step[] = [
  { id: 1, title: 'Пройти ознакомительный курс', description: 'Завершено 12.11.2025', status: 'completed', icon: '✓' },
  { id: 2, title: 'Пройти вводный курс', description: 'Тест не сдан. Попробуйте еще раз.', status: 'failed', icon: '!' },
  { id: 3, title: 'Пройти курс по технике безопасности', description: 'Это ваш следующий шаг. Приступите к обучению.', status: 'current', icon: '3' },
];

const AdaptationPage = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      
      <main className="main-content">
        <Header title="Мой план адаптации" />

        {/* Карточка прогресса */}
        <section className="card progress-card">
          <h2>Ваш общий прогресс</h2>
          <div className="progress-items">
            <div className="progress-item">
              <div className="progress-circle">100%</div>
              <div className="progress-info">
                <h3>Пройдено курсов</h3>
                <p>3 из 3</p>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-circle">100%</div>
              <div className="progress-info">
                <h3>Пройдено тестов</h3>
                <p>3 из 3</p>
              </div>
            </div>
          </div>
        </section>

        {/* Степпер */}
        <section className="card plan-card">
          <h2>Шаги вашего плана</h2>
          <div className="stepper">
            {steps.map((step) => (
              <div key={step.id} className={`step ${step.status}`}>
                <div className="step-icon">{step.icon}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
                {step.status === 'failed' && (
                  <div className="step-actions">
                    <button className="btn btn-secondary">Попробовать снова</button>
                  </div>
                )}
                {step.status === 'current' && (
                  <div className="step-actions">
                    <button className="btn btn-primary">Начать обучение</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdaptationPage;