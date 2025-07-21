/**
 * Universal clipboard utility that works on both HTTP and HTTPS
 * Falls back to document.execCommand for HTTP environments
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  console.log('Attempting to copy text:', text.substring(0, 50) + '...');
  
  // First try the modern Clipboard API (works on HTTPS)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Successfully copied using Clipboard API');
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand:', err);
    }
  } else {
    console.log('Clipboard API not available, using execCommand fallback');
  }

  // Fallback for HTTP environments using execCommand
  try {
    // Create a temporary textarea element that can be focused
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Position it off-screen but in a way that allows focus
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    // Add to the current active element's container to avoid dialog focus issues
    const activeContainer = document.activeElement?.closest('[role="dialog"]') || document.body;
    activeContainer.appendChild(textArea);
    
    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    
    // Wait a moment for the selection to take effect
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result = document.execCommand('copy');
    console.log('execCommand copy result:', result);
    
    // Clean up
    activeContainer.removeChild(textArea);
    
    if (!result) {
      throw new Error('execCommand returned false');
    }
    
    return true;
  } catch (err) {
    console.error('All clipboard methods failed:', err);
    
    // Last resort: try a different approach with input element
    try {
      const input = document.createElement('input');
      input.value = text;
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      input.style.top = '0';
      
      const activeContainer = document.activeElement?.closest('[role="dialog"]') || document.body;
      activeContainer.appendChild(input);
      
      input.focus();
      input.select();
      
      const result = document.execCommand('copy');
      activeContainer.removeChild(input);
      
      if (result) {
        console.log('Backup input method succeeded');
        return true;
      }
    } catch (backupErr) {
      console.error('Backup method also failed:', backupErr);
    }
    
    return false;
  }
}