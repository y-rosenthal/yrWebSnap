console.log('DOM Capture content script loaded');

const isClaudeAi = window.location.hostname.includes('claude.ai');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "captureDom") {
    (async () => {
      try {
        console.log('Starting DOM capture...');
        
        if (isClaudeAi) {
          console.log('Capturing Claude.ai page with simplified process...');
          // Create a deep clone of the current DOM
          const documentClone = document.cloneNode(true);
          
          // Remove all scripts
          documentClone.querySelectorAll('script').forEach(script => {
            script.remove();
          });

          // Capture all stylesheets, including external ones for Claude
          let styleSheets = '<style>\n';
          for (let sheet of document.styleSheets) {
            try {
              // Include all stylesheets for Claude.ai
              if (sheet.href) {
                // Convert external stylesheet to inline rules
                const response = await fetch(sheet.href);
                if (response.ok) {
                  const cssText = await response.text();
                  styleSheets += cssText + '\n';
                }
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

          // Capture computed styles for all elements
          const elements = documentClone.getElementsByTagName('*');
          let computedStyles = '<style>\n';
          console.log(`Processing styles for ${elements.length} elements...`);
          
          for (let element of elements) {
            try {
              const styles = window.getComputedStyle(element);
              const pseudoStyles = window.getComputedStyle(element, ':before');
              const afterPseudoStyles = window.getComputedStyle(element, ':after');
              
              const className = `dom-capture-${Math.random().toString(36).substr(2, 9)}`;
              element.classList.add(className);
              
              // Capture all computed styles
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
                if (value && value !== 'none') {
                  computedStyles += `  ${style}: ${value};\n`;
                }
              }
              computedStyles += '}\n';

              computedStyles += `.${className}:after {\n`;
              for (let style of afterPseudoStyles) {
                const value = afterPseudoStyles.getPropertyValue(style);
                if (value && value !== 'none') {
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

          // Preserve SVG elements and their styles
          documentClone.querySelectorAll('svg').forEach(svg => {
            try {
              // Remove any existing style-related attributes that might conflict
              svg.removeAttribute('class');
              svg.removeAttribute('style');
              
              // Clean up SVG children
              svg.querySelectorAll('*').forEach(child => {
                // Keep only essential attributes for SVG elements
                const keepAttributes = ['d', 'fill', 'stroke', 'width', 'height', 'viewBox'];
                const attributes = child.attributes;
                for (let i = attributes.length - 1; i >= 0; i--) {
                  const attr = attributes[i];
                  if (!keepAttributes.includes(attr.name)) {
                    child.removeAttribute(attr.name);
                  }
                }
              });

              // Apply computed styles directly to the SVG element
              const svgStyles = window.getComputedStyle(svg);
              const essentialSvgProps = ['width', 'height', 'fill', 'stroke'];
              essentialSvgProps.forEach(prop => {
                const value = svgStyles.getPropertyValue(prop);
                if (value && value !== 'none') {
                  svg.style[prop] = value;
                }
              });
            } catch (svgErr) {
              console.warn('Error processing SVG:', svgErr);
            }
          });

          const baseUrl = document.baseURI;
          
          // Convert relative URLs to absolute in the clone
          const domContent = documentClone.documentElement.outerHTML.replace(
            /(src|href)="([^"]+)"/g,
            (match, attr, url) => {
              if (!url.startsWith('http') && !url.startsWith('data:')) {
                return `${attr}="${new URL(url, baseUrl)}"`;
              }
              return match;
            }
          );
          
          // Clean up the DOM content before creating the final HTML
          const cleanDomContent = domContent.replace(
            /<svg[^>]*class="[^"]*"[^>]*>/g, 
            match => match.replace(/class="[^"]*"/, '')
          );
          
          // Create content with all styles
          const fullContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="robots" content="noindex">
                <title>Claude.ai Capture</title>
                <style>
                  /* Reset default styles */
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  
                  /* Preserve font settings */
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                    line-height: 1.4;
                    color: #000;
                  }

                  /* SVG defaults */
                  svg {
                    display: inline-block;
                    vertical-align: middle;
                  }
                </style>
                ${styleSheets}
                ${computedStyles}
              </head>
              <body>
                ${cleanDomContent}
              </body>
            </html>
          `;
          
          console.log('Claude.ai content prepared, sending to background script...');
          
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
        } else {
          // Create a deep clone of the current DOM to prevent modifications
          const documentClone = document.cloneNode(true);
          
          // Remove any script tags that might reinitialize the app
          documentClone.querySelectorAll('script').forEach(script => {
            if (!script.src || 
                script.src.includes('claude.ai') || 
                script.textContent.includes('claude.ai')) {
              script.remove();
            }
          });
          
          // Capture all stylesheets (including external ones)
          let styleSheets = '<style>\n';
          for (let sheet of document.styleSheets) {
            try {
              // Handle external stylesheets
              if (sheet.href) {
                // Skip claude.ai specific stylesheets
                if (sheet.href.includes('claude.ai')) continue;
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
          const elements = documentClone.getElementsByTagName('*');
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
          documentClone.querySelectorAll('script').forEach(script => {
            if (script.src) {
              scripts += `<script src="${script.src}"></script>\n`;
            } else if (script.textContent) {
              scripts += `<script>${script.textContent}</script>\n`;
            }
          });
          
          // Convert relative URLs to absolute
          const baseUrl = document.baseURI;
          const domContent = documentClone.documentElement.outerHTML.replace(
            /(src|href)="([^"]+)"/g,
            (match, attr, url) => {
              if (!url.startsWith('http') && !url.startsWith('data:')) {
                return `${attr}="${new URL(url, baseUrl)}"`;
              }
              return match;
            }
          );
          
          // Add meta tags to prevent auto-refresh and redirects
          const fullContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <base href="${baseUrl}">
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="no">
                <meta name="robots" content="noindex">
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
        }

        // Send immediate response to the original message
        sendResponse({ success: true });

      } catch (err) {
        console.error('Error capturing DOM:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
  }
  return true; // Keep the message channel open for the async response
}); 