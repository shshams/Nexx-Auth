/**
 * Universal clipboard utility that works on both HTTP and HTTPS
 * Falls back to document.execCommand for HTTP environments
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // First try the modern Clipboard API (works on HTTPS)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand:', err);
    }
  }

  // Fallback for HTTP environments using execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return result;
  } catch (err) {
    console.error('All clipboard methods failed:', err);
    return false;
  }
}