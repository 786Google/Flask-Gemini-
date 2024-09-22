
document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const menuBtn = document.getElementById('menuBtn');
    const promptInput = document.getElementById('promptInput');
    const chatArea = document.getElementById('chatArea');
    const sendBtn = document.getElementById('sendBtn');
    const leftSidebar = document.getElementById('leftSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const suggestionsContainer = document.getElementById('suggestions');
    const imageIcon = document.getElementById('imageIcon');
    const imageUpload = document.getElementById('imageUpload');
    const micIcon = document.getElementById('micIcon');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const greeting = document.getElementById('greeting');
    const profileBtn = document.getElementById('profileBtn');
    const temperatureInput = document.getElementById('temperatureInput');
    const topPInput = document.getElementById('topPInput');
    const topKInput = document.getElementById('topKInput');
    const maxTokensInput = document.getElementById('maxTokensInput');
  
    // State variables
    let uploadedImageURL = null;
    let isFirstMessage = true;
    let profileImage = null;
    let connected = false;
  
    // --- Socket.IO Connection Setup ---
    const socket = io();
  
    socket.on('connect', () => {
      connected = true;
      console.log("Connected to the server");
    });
  
    socket.on('disconnect', () => {
      connected = false;
      console.error("Disconnected from the server");
    });
    // --- End Socket.IO Connection Setup ---
  
    // Function to apply Markdown formatting using Showdown
    function applyMarkdown(text) {
      // Showdown options to preserve pre/code blocks and highlight code
      const converter = new showdown.Converter();
      converter.setOption('ghCompatibleHeaderId', true);
      converter.setOption('simpleLineBreaks', true);
      converter.setOption('smartIndentationFix', true);
      converter.setOption('literalMidWordUnderscores', true);
      converter.setOption('tables', true);
      converter.setOption('tasklists', true);
      converter.setOption('strikethrough', true);
      converter.setOption('parseImgDimensions', true);
      converter.setOption('ghCodeBlocks', true); 
      converter.setOption('smoothLivePreview', true); 
      converter.setOption('openLinksInNewWindow', true); 
      converter.setOption('encodeEmails', true); 
      converter.setOption('noHeaderId', true); 
      converter.setOption('ghCodeBlocks', true); // Enable GitHub-style code blocks
      converter.setOption('smoothLivePreview', true); // For smooth preview updates
      converter.setOption('simpleLineBreaks', true); // For simpler line breaks
      converter.setOption('openLinksInNewWindow', true); // Open links in new windows
      converter.setOption('encodeEmails', true); // Encode email addresses
      converter.setOption('noHeaderId', true); // Disable automatic header IDs
      converter.setOption('ghCompatibleHeaderId', true); // Use GitHub-style header IDs
      converter.setOption('tables', true); // Enable tables
      converter.setOption('tasklists', true); // Enable task lists
      converter.setOption('strikethrough', true); // Enable strikethroughs
      converter.setOption('parseImgDimensions', true); // Enable parsing image dimensions

      const html = converter.makeHtml(text);

      // Wrap code blocks for better display and make them scrollable horizontally
      const codeBlockRegex = /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
      const formattedHtml = html.replace(codeBlockRegex, (match, language, code) => {
          const languageClass = language ? `language-${language}` : '';
          return `<div class="code-container"> <div class="code-header"><span class="language-name ${languageClass}">${language || 'Plain Text'}</span><span class="${languageClass} copy-button">Copy Code</span></div><pre class="code-block"><code class="${languageClass}">${code}</code></pre></div>`;
      });

      // Wrap tables for horizontal scrolling
      const tableRegex = /<table>([\s\S]*?)<\/table>/g;
      const formattedHtmlWithTables = formattedHtml.replace(tableRegex, (match, tableContent) => {
        return `<div class="table-container"> <div class="code-header"><span class="language-name">Table</span><span class="copy-button">Copy Code</span></div>${match}</div>`;
      });

      return formattedHtmlWithTables;
    }
  
    // Function to append a message to the chat
    function appendMessage(message, sender, imageSrc = null) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', sender);
  
      if (imageSrc) {
        const imageElement = document.createElement('img');
        imageElement.src = imageSrc;
        messageDiv.appendChild(imageElement);
      }
  
      messageDiv.innerHTML = message;
      chatArea.appendChild(messageDiv);
  
      // Add copy code button functionality to newly added code blocks
      const copyButtons = messageDiv.querySelectorAll('.copy-button');
      copyButtons.forEach(button => {
          button.addEventListener('click', () => {
              const codeBlock = button.closest('.code-container').querySelector('.code-block code');
              const tableBlock = button.closest('.table-container').querySelector('table'); 
              if (codeBlock) { 
                const codeToCopy = codeBlock.textContent;
                navigator.clipboard.writeText(codeToCopy)
                  .then(() => {
                      // Optionally show a success message
                      button.textContent = "Copied!";
                      setTimeout(() => {
                          button.textContent = "Copy Code";
                      }, 1500); 
                  })
                  .catch(err => {
                      console.error("Failed to copy: ", err);
                  });
              } else if (tableBlock) { // Handle table copy
                const tableToCopy = tableBlock.innerHTML; // Use innerHTML for table
                navigator.clipboard.writeText(tableToCopy)
                  .then(() => {
                      button.textContent = "Copied!";
                      setTimeout(() => {
                          button.textContent = "Copy Code";
                      }, 1500); 
                  })
                  .catch(err => {
                      console.error("Failed to copy: ", err);
                  });
              }
          });
      });
  
  
      scrollToBottom();
      return messageDiv;
    }
    // Function to show loading animation
    function showLoadingAnimation() {
      const loadingBar = document.createElement('div');
      loadingBar.classList.add('loading-bar');
      chatArea.appendChild(loadingBar);
    }
  
    // Function to hide loading animation
    function hideLoadingAnimation() {
      const loadingBar = document.querySelector('.loading-bar');
      if (loadingBar) {
        chatArea.removeChild(loadingBar);
      }
    }
  
    // Send button click event handler
    sendBtn.addEventListener('click', () => {
      const message = promptInput.value.trim();
  
      if (message || uploadedImageURL) {
        if (isFirstMessage) {
          suggestionsContainer.style.display = 'none';
          greeting.style.display = 'none';
          isFirstMessage = false;
        }
  
        appendMessage(message, 'user', uploadedImageURL);
        promptInput.value = '';
        uploadedImageURL = null;
        removeImagePreview();
        showLoadingAnimation();
  
        const generationConfig = {
          temperature: parseFloat(temperatureInput.value),
          top_p: parseFloat(topPInput.value),
          top_k: parseInt(topKInput.value),
          max_output_tokens: parseInt(maxTokensInput.value)
        };
  
        if (connected) {
          socket.emit('message', {
            message: message,
            temperature: generationConfig.temperature,
            top_p: generationConfig.top_p,
            top_k: generationConfig.top_k,
            max_output_tokens: generationConfig.max_output_tokens
          });
        } else {
          console.error("Not connected to the server");
          appendMessage('Error: Connection to the server lost.', 'gemini');
          hideLoadingAnimation();
        }
      }
    });
  
    // --- Handle Streaming Responses ---
    let currentMessageElement = null; 
    let aggregatedResponseText = ''; 
  
    socket.on('response', (data) => {
      if (data.chunk) {
        if (!currentMessageElement) {
          currentMessageElement = appendMessage('', 'gemini');
        }
  
        aggregatedResponseText += data.chunk;
        currentMessageElement.innerHTML = applyMarkdown(aggregatedResponseText);
        scrollToBottom();
      }
  
      if (data.complete) {
        currentMessageElement = null; 
        aggregatedResponseText = ''; 
        hideLoadingAnimation();
      }
    });
    // --- End Streaming Response Handling ---
  
    // Handle suggestions click events
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target.classList.contains('suggestion')) {
        promptInput.value = target.textContent.trim();
      }
    });
  
    // Handle enter key press in input
    promptInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        sendBtn.click();
      }
    });
  
    // Handle image icon click to trigger file input
    imageIcon.addEventListener('click', () => {
      imageUpload.click();
    });
  
    // Function to remove image preview
    function removeImagePreview() {
      const imagePreview = promptInput.parentNode.querySelector('img');
      if (imagePreview) {
        imagePreview.remove();
      }
    }
  
    // Handle image upload change event
    imageUpload.addEventListener('change', (event) => {
      const file = event.target.files[0];
  
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          removeImagePreview();
          uploadedImageURL = e.target.result;
  
          const imagePreview = document.createElement('img');
          imagePreview.src = uploadedImageURL;
          promptInput.parentNode.insertBefore(imagePreview, promptInput.nextSibling);
        };
        reader.readAsDataURL(file);
      }
    });
  
    // Handle mic icon click to start speech recognition (Placeholder)
    micIcon.addEventListener('click', () => {
      // You'll need to implement speech-to-text logic here
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      // ... Speech Recognition setup and handling ...
    });
  
    // Function to handle automatic scrolling
    function scrollToBottom(smooth = true) {
      chatArea.scroll({
        top: chatArea.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  
    // Profile Picture Update (Placeholder)
    profileBtn.addEventListener('click', () => {
      // Implement logic to handle profile picture uploads
    });
  
    // Sidebar toggle functionality
    menuBtn.addEventListener('click', () => {
      leftSidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('open');
    });
  
    closeSidebarBtn.addEventListener('click', () => {
      leftSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  
    sidebarOverlay.addEventListener('click', () => {
      leftSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  });
    