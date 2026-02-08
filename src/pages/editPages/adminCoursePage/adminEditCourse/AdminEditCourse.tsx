import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminEditCourse.css';

export const AdminEditCourse: React.FC = () => {
  const navigate = useNavigate();

  const [courseName, setCourseName] = useState('Основы корпоративной безопасности');
  const [courseDesc, setCourseDesc] = useState('Корпоративные данные — это актив компании, и их разглашение может нанести ущерб бизнесу. Поэтому никогда не используйте простые пароли вроде «12345» и не оставляйте рабочие документы на экране монитора без присмотра.');
  
  const [materials, setMaterials] = useState<string[]>([
    'https://storage.yandexcloud.net/onboarding/основы_корпоративной_безопасности_v1.pdf',
    'https://storage.yandexcloud.net/onboarding/основы_корпоративной_безопасности_v2.pdf'
  ]);

  const [tests, setTests] = useState<string[]>([
    'Тест: "Тест по курсу Основы корпоративной безопасности"',
    'Тест: "Обратная связь по курсу Основы корпоративной безопасности"'
  ]);

  const removeMaterial = (index: number) => setMaterials(materials.filter((_, i) => i !== index));
  const removeTest = (index: number) => setTests(tests.filter((_, i) => i !== index));

  return (
    <div className="edit-page-container">
      <div className="edit-card">
        
        <div className="form-section">
          <label className="section-label">Название курса</label>
          <input
            className="input-field"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label className="section-label">Описание курса</label>
          <textarea
            className="textarea-field"
            value={courseDesc}
            onChange={(e) => setCourseDesc(e.target.value)}
          />
        </div>

        {/* Кнопка Добавить материал */}
        <button className="dashed-add-btn">
          <span className="plus-icon">+</span> Добавить материал
        </button>

        <div className="section-group">
          <h3 className="group-title">Материал для курса</h3>
          {materials.map((mat, i) => (
            <div key={i} className="item-row white-bg">
              <span className="item-text">{mat}</span>
              <button className="delete-btn" onClick={() => removeMaterial(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* Кнопка Добавить тест */}
        <button className="dashed-add-btn">
          <span className="plus-icon">+</span> Добавить существующий тест
        </button>

        <div className="section-group">
          {tests.map((test, i) => (
            <div key={i} className="item-row grey-bg">
              <span className="item-text">{test}</span>
              <button className="delete-btn" onClick={() => removeTest(i)}>✕</button>
            </div>
          ))}
        </div>

        <div className="footer-bar">
          <button className="save-btn" onClick={() => navigate('/admin/training')}>
            <span className="check-icon">✓</span> СОХРАНИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditCourse;