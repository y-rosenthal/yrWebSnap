console.log('DOM Capture content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "captureDom") {
    try {
      console.log('Starting DOM capture...');
      
      // Capture all stylesheets (including external ones)
      let styleSheets = '<style>\n';
      for (let sheet of document.styleSheets) {
        try {
          // Handle external stylesheets
          if (sheet.href) {
            styleSheets += `@import url("${sheet.href}");\n`;
          }
          // Handle inline styles
          for (let rule of sheet.cssRules) {
            styleSheets += rule.cssText + '\n';
          }
        } catch (e) {
          console.warn('Could not access stylesheet:', e);
        }
      }
      styleSheets += '</style>';
      
      // Capture computed styles for elements
      const elements = document.getElementsByTagName('*');
      let computedStyles = '<style>\n';
      console.log(`Processing styles for ${elements.length} elements...`);
      
      for (let element of elements) {
        try {
          const styles = window.getComputedStyle(element);
          const pseudoStyles = window.getComputedStyle(element, ':before');
          const className = `dom-capture-${Math.random().toString(36).substr(2, 9)}`;
          element.classList.add(className);
          
          computedStyles += `.${className} {\n`;
          for (let style of styles) {
            const value = styles.getPropertyValue(style);
            if (value) {
              computedStyles += `  ${style}: ${value};\n`;
            }
          }
          computedStyles += '}\n';
          
          // Add pseudo-element styles
          computedStyles += `.${className}:before {\n`;
          for (let style of pseudoStyles) {
            const value = pseudoStyles.getPropertyValue(style);
            if (value) {
              computedStyles += `  ${style}: ${value};\n`;
            }
          }
          computedStyles += '}\n';
        } catch (styleErr) {
          console.warn('Error processing element styles:', styleErr);
          continue;
        }
      }
      computedStyles += '</style>';
      
      // Capture scripts
      let scripts = '';
      document.querySelectorAll('script').forEach(script => {
        if (script.src) {
          scripts += `<script src="${script.src}"></script>\n`;
        } else if (script.textContent) {
          scripts += `<script>${script.textContent}</script>\n`;
        }
      });
      
      // Convert relative URLs to absolute
      const baseUrl = document.baseURI;
      const domContent = document.documentElement.outerHTML.replace(
        /(src|href)="([^"]+)"/g,
        (match, attr, url) => {
          if (!url.startsWith('http') && !url.startsWith('data:')) {
            return `${attr}="${new URL(url, baseUrl)}"`;
          }
          return match;
        }
      );
      
      // Combine everything
      const fullContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <base href="${baseUrl}">
            <meta charset="UTF-8">
            ${styleSheets}
            ${computedStyles}
          </head>
          <body>
            ${domContent}
            ${scripts}
          </body>
        </html>
      `;
      
      console.log('Full content prepared, sending to background script...');
      
      // Send the captured DOM to background script for download
      chrome.runtime.sendMessage({
        action: "downloadDom",
        dom: fullContent
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('Background script received the message:', response);
        }
      });

      // Send immediate response to the original message
      sendResponse({ success: true });

    } catch (err) {
      console.error('Error capturing DOM:', err);
      sendResponse({ success: false, error: err.message });
    }
  }
  return true; // Keep the message channel open for the async response
}); 