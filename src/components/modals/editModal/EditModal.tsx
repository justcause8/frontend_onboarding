import React, { useState, useEffect } from 'react';
import './EditModal.css';

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h3>{title}</h3>
                </div>
                
                <div className="modal-body">
                    <div className="input-group">
                        <label className="input-label">Название</label>
                        <input 
                            className="modal-input"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {categories && (
                        <div className="input-group mt-16">
                            <label className="input-label">Категория</label>
                            <select 
                                className="modal-input" 
                                value={selectedCat} 
                                onChange={e => setSelectedCat(e.target.value)}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="modal-btn btn-cancel" onClick={onClose}>Отмена</button>
                    <button className="modal-btn btn-save" onClick={() => onSave(inputValue, selectedCat)}>
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;