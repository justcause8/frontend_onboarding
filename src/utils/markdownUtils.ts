export function stripMarkdown(text: string): string {
    return text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/^[-*]\s/gm, '')
        .replace(/^\d+\.\s/gm, '')
        .replace(/^>\s/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();
}
