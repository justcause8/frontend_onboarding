import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MenuIcon from '@/assets/editMode/MenuIcon.png';
import EditIcon from '@/assets/editMode/EditIcon.png';
import DeleteIcon from '@/assets/editMode/DeleteIcon.png';
import LockIcon from '@/assets/editMode/LockIcon.png';
import UnlockIcon from '@/assets/editMode/UnlockIcon.png';
import './ActionMenu.css';

export const ICONS = {
    edit: EditIcon,
    delete: DeleteIcon,
    lock: LockIcon,
    unlock: UnlockIcon,
};

interface ActionMenuItemProps {
    icon: string;
    label: string;
    onClick: () => void;
    className?: string;
}

// Универсальный элемент меню
export const ActionMenuItem: React.FC<ActionMenuItemProps> = ({ icon, label, onClick, className = "" }) => (
    <div className={`dropdown-item ${className}`} onClick={(e) => {
        e.stopPropagation();
        onClick();
    }}>
        <span className="dd-icon">
            <img src={icon} alt={label} />
        </span>
        {label}
    </div>
);

interface ActionMenuProps {
    children: React.ReactNode;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, showAbove: false });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuHeight = 150; 
            const spaceBelow = window.innerHeight - rect.bottom;
            const showAbove = spaceBelow < menuHeight;

            setCoords({
                top: showAbove ? rect.top + window.scrollY : rect.bottom + window.scrollY,
                left: rect.right + window.scrollX - 180, // Ширина меню
                showAbove
            });
        }
    };

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        updatePosition();
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) {
            document.addEventListener('mousedown', (e) => {
                if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
            });
            window.addEventListener('scroll', close);
        }
        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', close);
        };
    }, [isOpen]);

    return (
        <>
            <button ref={buttonRef} className="icon-btn" onClick={toggleMenu}>
                <img src={MenuIcon} alt="menu" className="btn-icon-img" />
            </button>

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className={`dropdown-menu portal-menu ${coords.showAbove ? 'show-above' : ''}`}
                    style={{ 
                        position: 'absolute',
                        top: coords.showAbove ? coords.top - 8 : coords.top + 8,
                        left: coords.left,
                        transform: coords.showAbove ? 'translateY(-100%)' : 'none'
                    }}
                    onClick={() => setIsOpen(false)}
                >
                    {children}
                </div>,
                document.body
            )}
        </>
    );
};