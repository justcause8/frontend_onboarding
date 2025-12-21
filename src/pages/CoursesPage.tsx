import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface Course {
  id: number;
  title: string;
  description: string;
}

const courses: Course[] = [
  { id: 1, title: 'Ознакомительный курс', description: 'Основные принципы работы в компании и знакомство с корпоративной культурой.' },
  { id: 2, title: 'Вводный курс', description: 'Детальное погружение в ваши рабочие обязанности и инструменты.' },
  { id: 3, title: 'Техника безопасности', description: 'Изучение правил и норм безопасности на рабочем месте.' },
];

const CoursesPage = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Header title="Мои курсы" />
        
        <section className="courses-grid">
          {courses.map(course => (
            <article key={course.id} className="course-card">
              <div className="card-image">[ Изображение курса ]</div>
              <div className="card-content">
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="card-actions">
                  <button className="btn btn-primary">Пройти</button>
                  <button className="btn btn-secondary">Тест</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default CoursesPage;