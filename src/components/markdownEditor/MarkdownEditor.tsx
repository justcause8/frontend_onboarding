import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './MarkdownEditor.css';

function wrapSelection(
    textarea: HTMLTextAreaElement,
    before: string,
    after: string,
    placeholder: string,
    onChange: (val: string) => void
) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end) || placeholder;

    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);

    // Восстанавливаем фокус и выделение
    requestAnimationFrame(() => {
        textarea.focus();
        const newStart = start + before.length;
        const newEnd = newStart + selected.length;
        textarea.setSelectionRange(newStart, newEnd);
    });
}

function insertLine(
    textarea: HTMLTextAreaElement,
    prefix: string,
    onChange: (val: string) => void
) {
    const start = textarea.selectionStart;
    const value = textarea.value;

    // Находим начало строки
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const line = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    const newLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
    const newValue =
        value.slice(0, lineStart) +
        newLine +
        (lineEnd === -1 ? '' : value.slice(lineEnd));

    onChange(newValue);

    requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
    });
}


interface MarkdownEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder = 'Введите текст...',
    minHeight = '120px',
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    const wrap = (before: string, after: string, placeholder: string) => {
        if (ref.current) wrapSelection(ref.current, before, after, placeholder, onChange);
    };

    const line = (prefix: string) => {
        if (ref.current) insertLine(ref.current, prefix, onChange);
    };

    const buttons: { title: string; label: React.ReactNode; action: () => void }[] = [
        { title: 'Жирный (Ctrl+B)',    label: <b>B</b>,  action: () => wrap('**', '**', 'жирный текст') },
        { title: 'Курсив (Ctrl+I)',    label: <i>I</i>,  action: () => wrap('*', '*', 'курсив') },
        { title: 'Зачёркнутый',        label: <s>S</s>,  action: () => wrap('~~', '~~', 'зачёркнутый') },
        { title: 'Заголовок H2',       label: 'H2',      action: () => line('## ') },
        { title: 'Заголовок H3',       label: 'H3',      action: () => line('### ') },
        { title: 'separator' as any,   label: null,      action: () => {} },
        { title: 'Маркированный список', label: '•—',    action: () => line('- ') },
        { title: 'Нумерованный список',  label: '1.',    action: () => line('1. ') },
        { title: 'separator' as any,   label: null,      action: () => {} },
        { title: 'Цитата',             label: '❝',       action: () => line('> ') },
        { title: 'Код',                label: '</>',     action: () => wrap('`', '`', 'код') },
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); wrap('**', '**', 'жирный текст'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); wrap('*', '*', 'курсив'); }
    };

    return (
        <div className="md-editor">
            <div className="md-toolbar">
                {buttons.map((btn, i) =>
                    btn.title === 'separator' ? (
                        <div key={i} className="md-toolbar-separator" />
                    ) : (
                        <button
                            key={i}
                            type="button"
                            className="md-toolbar-btn"
                            title={btn.title}
                            onMouseDown={e => { e.preventDefault(); btn.action(); }}
                        >
                            {btn.label}
                        </button>
                    )
                )}
            </div>
            <textarea
                ref={ref}
                className="md-textarea"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                style={{ minHeight }}
            />
        </div>
    );
};


interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => (
    <div className={`md-view ${className}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
    </div>
);
