export const buildMailto = (
    recipientEmail: string,
    recipientName: string,
    senderName: string
): string => {
    const parts = recipientName.trim().split(/\s+/);
    let displayName = recipientName;
    
    if (parts.length >= 3) {
        displayName = `${parts[1]} ${parts[2]}`;
    } else if (parts.length === 2) {
        displayName = `${parts[1]} ${parts[0]}`;
    }

    const subject = encodeURIComponent(`Вопрос от ${senderName}`);
    const body = encodeURIComponent(
        `Добрый день, ${displayName}!\n\n\n\nС уважением,\n${senderName}`
    ); 

    return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
};