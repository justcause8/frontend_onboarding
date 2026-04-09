import React, { useState, useEffect } from 'react';
import './EditModal.css';
import downIcon from '@/assets/editMode/DownIcon.png';

interface EditModalProps {
    isOpen: boolean;
    title: string;
    initialValue: string;
    onClose: () => void;
    onSave: (newValue: string, newCategory?: string) => void;
    categories?: string[];
    currentCategory?: string;
}

const EditModal: React.FC<EditModalProps> = ({ 
    isOpen, 
    title, 
    initialValue, 
    onClose, 
    onSave, 
    categories, 
    currentCategory 
}) => {
    const [inputValue, setInputValue] = useState(initialValue);
    const [selectedCat, setSelectedCat] = useState(currentCategory || 'Общее');
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);
    const [catSearchQuery, setCatSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputValue(initialValue);
            setSelectedCat(currentCategory || 'Общее');
        }
    }, [initialValue, currentCategory, isOpen]);

    if (!isOpen) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSave(inputValue, selectedCat);
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="modal-overlay text" onClick={onClose}>
            <div className="modal-edit-content" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h2>{title}</h2>
                </div>
                
                <div className="modal-body">
                    <div className="input-item">
                        <h4>Название</h4>
                        <input
                            className="input-field"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {categories && (
                        <div className="input-item">
                            <h4>Категория</h4>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="input-field"
                                    value={catSearchQuery}
                                    onChange={e => { setCatSearchQuery(e.target.value); setCatDropdownOpen(true); }}
                                    onFocus={() => setCatDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setCatDropdownOpen(false), 150)}
                                    placeholder="Выбрать категорию..."
                                />
                                <div className={`search-arrow${catDropdownOpen ? ' open' : ''}`} onClick={() => setCatDropdownOpen(v => !v)}>
                                    <img className="search-dropdown" src={downIcon} alt="" />
                                </div>
                                {catDropdownOpen && (
                                    <div className="search-results">
                                        {categories
                                            .filter(c => c.toLowerCase().includes(catSearchQuery.toLowerCase()))
                                            .map(c => (
                                                <div
                                                    key={c}
                                                    className={`search-item${selectedCat === c ? ' selected' : ''}`}
                                                    onMouseDown={e => e.preventDefault()}
                                                    onClick={() => { setSelectedCat(c); setCatSearchQuery(''); setCatDropdownOpen(false); }}
                                                >
                                                    {c}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                            <div className="chips-display-zone" style={{ marginTop: '8px' }}>
                                <div className="chip department-chip">{selectedCat}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={() => onSave(inputValue, selectedCat)}>
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;