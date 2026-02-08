
import React, { useState, type ChangeEvent } from 'react';
import './TestPageEdit.css';

// Импорты иконок
import CloseQuest from '../img/Test/CloseQuestion.png';
import MultiQuest from '../img/Test/MultiQuestion.png';
import InfoOutlined from '../img/Test/InfoOutlined.png';
import TickIcon from '../img/Test/TickIcon.png';

type QuestionType = 'Закрытый' | 'Множественный выбор';

interface Question {
    uniqueId: string;
    type: QuestionType;
    text: string;
    answers: string[];
}

const TestPageEdit: React.FC = () => {
    const [title, setTitle] = useState<string>('');
    const [passingScore, setPassingScore] = useState<string>('');
    const [questions, setQuestions] = useState<Question[]>([
        { uniqueId: 'q1', type: 'Закрытый', text: '', answers: ['', ''] }
    ]);

    // Функция перемещения вопроса (та самая логика со стрелками)
    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= questions.length) return;

        const updatedQuestions = [...questions];
        const [movedItem] = updatedQuestions.splice(index, 1);
        updatedQuestions.splice(newIndex, 0, movedItem);
        setQuestions(updatedQuestions);
    };

    const addNewQuestion = (type: QuestionType) => {
        if (questions.length >= 10) return;
        setQuestions([...questions, {
            uniqueId: `q${Date.now()}`,
            type: type,
            text: '',
            answers: ['', '']
        }]);
    };

    const deleteQuestion = (uniqueId: string) => {
        setQuestions(questions.filter(q => q.uniqueId !== uniqueId));
    };

    const handleAnswerChange = (qId: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.uniqueId === qId) {
                const newAnswers = [...q.answers];
                newAnswers[index] = value;
                return { ...q, answers: newAnswers };
            }
            return q;
        }));
    };

    const addAnswerField = (qId: string) => {
        setQuestions(questions.map(q => 
            q.uniqueId === qId ? { ...q, answers: [...q.answers, ''] } : q
        ));
    };

    return (
        <div className="survey-page">
            <div className="survey-form">
                <div className="survey-title">
                    <input
                        type="text"
                        placeholder="Введите название теста"
                        value={title}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    />
                </div>

                <div className="survey-content-wrapper">
                    {questions.map((q, index) => (
                        <div key={q.uniqueId} className="question-container">
                            <div className="question-header">
                                <div className="question-type-info">
                                    <img 
                                        src={q.type === 'Закрытый' ? CloseQuest : MultiQuest} 
                                        alt="icon" 
                                        className="q-type-icon-main" 
                                    />
                                    <span className="question-type-label-large">{q.type.toUpperCase()}</span>
                                </div>
                                <div className="question-actions">
                                    {/* Кнопки перемещения */}
                                    <button 
                                        type="button" 
                                        className="action-btn move-btn" 
                                        onClick={() => moveQuestion(index, 'up')}
                                        disabled={index === 0}
                                    >↑</button>
                                    <button 
                                        type="button" 
                                        className="action-btn move-btn" 
                                        onClick={() => moveQuestion(index, 'down')}
                                        disabled={index === questions.length - 1}
                                    >↓</button>
                                    <button type="button" className="action-btn delete-btn" onClick={() => deleteQuestion(q.uniqueId)}>✕</button>
                                </div>
                            </div>

                            <input
                                type="text"
                                className="question-input"
                                placeholder="Текст вопроса"
                                value={q.text}
                                onChange={(e) => setQuestions(questions.map(item => 
                                    item.uniqueId === q.uniqueId ? { ...item, text: e.target.value } : item
                                ))}
                            />

                            <div className="answers-section">
                                {q.answers.map((ans, i) => (
                                    <div key={i} className="answer-row">
                                        <div className={`answer-marker ${q.type === 'Закрытый' ? 'round' : 'square'}`}></div>
                                        <input
                                            type="text"
                                            className="answer-input"
                                            placeholder={`Вариант ${i + 1}`}
                                            value={ans}
                                            onChange={(e) => handleAnswerChange(q.uniqueId, i, e.target.value)}
                                        />
                                    </div>
                                ))}
                                <button type="button" className="add-answer-link" onClick={() => addAnswerField(q.uniqueId)}>
                                    + ДОБАВИТЬ ВАРИАНТ
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Кнопки добавления */}
                    <div className="add-question-placeholder">
                        <span className="add-question-title">Добавить новый вопрос</span>
                        <div className="question-type-buttons">
                            <div className="q-type-btn" onClick={() => addNewQuestion('Закрытый')}>
                                <img src={CloseQuest} alt="close" className="q-type-icon-large" />
                                <span className="q-type-label-btn">Закрытый</span>
                            </div>
                            <div className="q-type-btn" onClick={() => addNewQuestion('Множественный выбор')}>
                                <img src={MultiQuest} alt="multi" className="q-type-icon-large" />
                                <span className="q-type-label-btn">Несколько</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="score-config-container">
                    <input 
                        type="text" 
                        className="score-input-field" 
                        placeholder="Проходной балл: “число”"
                        value={passingScore}
                        onChange={(e) => setPassingScore(e.target.value)}
                    />
                </div>

                <div className="ButtonSaveContainer">
                    <button className="ButtonSaveGrey" type="button">
                        <img src={TickIcon} alt="save" className="TickIcon" />
                        СОХРАНИТЬ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestPageEdit;









