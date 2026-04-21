import React, { useRef, useState } from 'react';
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

    // Проверяем, уже ли выделенный текст обёрнут в маркер
    const beforeText = value.slice(0, start);
    const afterText = value.slice(end);
    const lastOpen = beforeText.lastIndexOf(before);
    const isWrapped =
        lastOpen !== -1 &&
        !beforeText.slice(lastOpen + before.length).includes(before) &&
        afterText.startsWith(after);

    if (isWrapped) {
        // Снимаем маркер
        const innerStart = lastOpen + before.length;
        const innerEnd = end;
        const inner = value.slice(innerStart, innerEnd);
        const newValue = value.slice(0, lastOpen) + inner + value.slice(end + after.length);
        onChange(newValue);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(lastOpen, lastOpen + inner.length);
        });
    } else {
        const selected = value.slice(start, end) || placeholder;
        const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
            textarea.focus();
            const newStart = start + before.length;
            const newEnd = newStart + selected.length;
            textarea.setSelectionRange(newStart, newEnd);
        });
    }
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
    className?: string;
}

/** Считает количество полных (закрытых) пар маркера до позиции */
function countClosedPairs(text: string, marker: string): number {
    let count = 0;
    let i = 0;
    while (i <= text.length - marker.length) {
        if (text.slice(i, i + marker.length) === marker) {
            count++;
            i += marker.length;
        } else {
            i++;
        }
    }
    return count;
}

/** Определяет, активен ли форматирующий маркер вокруг курсора/выделения */
function getActiveMarkers(value: string, selStart: number, selEnd: number): Set<string> {
    const active = new Set<string>();

    const before = value.slice(0, selStart);
    const after  = value.slice(selEnd);

    // Жирный **...**:
    // нечётное число ** до курсора => курсор внутри **
    const boldCount = countClosedPairs(before, '**');
    if (boldCount % 2 === 1) {
        // проверяем что есть закрывающий ** после
        if (after.includes('**')) active.add('bold');
    }

    // Курсив *...*:
    // ищем одиночные * (не **), нечётное кол-во => внутри *
    if (!active.has('bold')) {
        // убираем все ** из строки перед курсором чтобы не мешали
        const beforeNoDouble = before.replace(/\*\*/g, '\x00\x00');
        const italicCount = (beforeNoDouble.match(/\*/g) || []).length;
        if (italicCount % 2 === 1) {
            const afterNoDouble = after.replace(/\*\*/g, '\x00\x00');
            if (/\*/.test(afterNoDouble)) active.add('italic');
        }
    }

    // Код `...`:
    const codeCount = countClosedPairs(before, '`');
    if (codeCount % 2 === 1) {
        if (after.includes('`')) active.add('code');
    }

    // Строчные префиксы — текущая строка
    const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
    const lineEnd   = value.indexOf('\n', selStart);
    const line      = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (line.startsWith('## '))  active.add('h2');
    if (line.startsWith('### ')) active.add('h3');
    if (line.startsWith('- '))   active.add('ul');
    if (line.match(/^\d+\. /))   active.add('ol');

    return active;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder = 'Введите текст...',
    minHeight = '120px',
    className = '',
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [activeMarkers, setActiveMarkers] = useState<Set<string>>(new Set());
    const [isPreview, setIsPreview] = useState(false);

    const wrap = (before: string, after: string, placeholder: string) => {
        if (ref.current) wrapSelection(ref.current, before, after, placeholder, onChange);
    };

    const line = (prefix: string) => {
        if (ref.current) insertLine(ref.current, prefix, onChange);
    };

    const updateActiveMarkers = () => {
        if (!ref.current) return;
        const { selectionStart, selectionEnd, value: v } = ref.current;
        setActiveMarkers(getActiveMarkers(v, selectionStart, selectionEnd));
    };

    const buttons: { title: string; label: React.ReactNode; action: () => void; activeKey?: string }[] = [
        { title: 'Жирный (Ctrl+B)',      label: <b>B</b>, action: () => wrap('**', '**', 'жирный текст'), activeKey: 'bold'   },
        { title: 'Курсив (Ctrl+I)',       label: <i>I</i>, action: () => wrap('*', '*', 'курсив'),          activeKey: 'italic' },
        { title: 'separator' as any,      label: null,     action: () => {} },
        { title: 'Заголовок H2',          label: 'H2',     action: () => line('## '),                       activeKey: 'h2'     },
        { title: 'Заголовок H3',          label: 'H3',     action: () => line('### '),                      activeKey: 'h3'     },
        { title: 'separator' as any,      label: null,     action: () => {} },
        { title: 'Маркированный список',  label: '-',      action: () => line('- '),                        activeKey: 'ul'     },
        { title: 'Нумерованный список',   label: '1.',     action: () => line('1. '),                       activeKey: 'ol'     },
        { title: 'separator' as any,      label: null,     action: () => {} },
        { title: 'Код',                   label: '</>',    action: () => wrap('`', '`', 'код'),             activeKey: 'code'   },
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); wrap('**', '**', 'жирный текст'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); wrap('*', '*', 'курсив'); }
    };

    return (
        <div className={`md-editor${className ? ' ' + className : ''}`}>
            <div className="md-toolbar">
                {!isPreview && buttons.map((btn, i) =>
                    btn.title === 'separator' ? (
                        <div key={i} className="md-toolbar-separator" />
                    ) : (
                        <button
                            key={i}
                            type="button"
                            className={`md-toolbar-btn${btn.activeKey && activeMarkers.has(btn.activeKey) ? ' md-toolbar-btn--active' : ''}`}
                            title={btn.title}
                            onMouseDown={e => { e.preventDefault(); btn.action(); }}
                        >
                            {btn.label}
                        </button>
                    )
                )}
                <div className="md-toolbar-spacer" />
                <button
                    type="button"
                    className={`md-toolbar-btn md-preview-btn${isPreview ? ' md-toolbar-btn--active' : ''}`}
                    title={isPreview ? 'Редактировать' : 'Предпросмотр'}
                    onMouseDown={e => { e.preventDefault(); setIsPreview(p => !p); }}
                >
                    {isPreview ? 'Изменить' : 'Предпросмотр'}
                </button>
            </div>
            {isPreview ? (
                <div className="md-preview-area" style={{ minHeight }}>
                    {value
                        ? <MarkdownViewer content={value} />
                        : <span className="md-preview-placeholder">{placeholder}</span>
                    }
                </div>
            ) : (
                <textarea
                    ref={ref}
                    className="md-textarea"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={updateActiveMarkers}
                    onMouseUp={updateActiveMarkers}
                    onSelect={updateActiveMarkers}
                    placeholder={placeholder}
                    style={{ minHeight }}
                />
            )}
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
