<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>SYNAGLO - Health Recommendations</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <!-- Top Header -->
    <header class="top-header">
        <div class="header-content">
            <div class="header-title">
                <div class="logo-container">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAWATCH Logo" class="header-logo-small">
                    <div class="logo-text">
                        <h1>Health Recommendations</h1>
                        <p class="subtitle">Personal suggestions for your health</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Avatar and Chat Wrapper -->
        <div class="avatar-chat-wrapper">
            <!-- 3D Avatar Section -->
            <div class="avatar-section">
                <div id="avatarContainer" class="avatar-container"></div>
                <div class="avatar-info">
                    <p>Dr. Synachat</p>
                </div>
            </div>

            <!-- Chat Section -->
            <section class="chat-section">
                <div class="chat-container">
                    <!-- Chat Header -->
                    <div class="chat-header">
                        <div class="chat-header-content">
                            <div class="chat-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="chat-header-text">
                                <h3>Dr. Synachat</h3>
                                <p>AI Health Assistant</p>
                            </div>
                        </div>
                        <div class="chat-header-actions">
                            <button id="clearChatBtn" class="chat-action-btn" title="Clear chat">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Chat Messages -->
                    <div class="chat-messages" id="chatMessages">
                        <div class="chat-welcome">
                            <div class="welcome-icon">
                                <i class="fas fa-robot"></i>
                            </div>
                            <h3>Welcome to Dr. Synachat</h3>
                            <p>Ask me anything about your health. I'm here to help with personalized health guidance.
                            </p>
                            <small>Note: I'm an AI assistant, not a replacement for professional medical advice.</small>
                        </div>
                    </div>

                    <!-- Chat Input -->
                    <div class="chat-input-wrapper">
                        <div class="chat-input-container">
                            <input type="text" id="messageInput" class="chat-input"
                                placeholder="Ask me about your health..." autocomplete="off">
                            <button id="sendBtn" class="send-btn" title="Send message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button id="speakBtn" class="speak-btn" title="Speak message">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </div>
                        <div class="chat-controls">
                            <button id="autoSpeechBtn" class="control-btn" title="Toggle auto speech">
                                <i class="fas fa-volume-mute"></i>
                                <span>Auto Speech</span>
                            </button>
                            <button id="readLastBtn" class="control-btn" title="Read last response">
                                <i class="fas fa-volume-up"></i>
                                <span>Read Response</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- Avatar Loader - Animated CSS Avatar -->
    <script src="{{ asset('js/avatar-loader.js') }}"></script>

    <!-- Auth Guard - must be loaded first -->
    <script src="{{ asset('js/components/auth-guard.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script src="{{ asset('js/components/navbar.js') }}"></script>
    <script src="{{ asset('js/components/tooltips.js') }}"></script>

    <script>
        // Chat Configuration
        const chatConfig = {
            messageEndpoint: '/synachat/send',
            maxMessages: 50,
            typingSpeed: 30 // ms per character for typing effect
        };

        // Global state
        let chatState = {
            messages: [],
            isLoading: false,
            lastResponse: '',
            speechSynthesis: window.speechSynthesis,
            autoSpeech: localStorage.getItem('autoSpeech') === 'true' || false
        };

        // DOM Elements
        let elements = {};

        /**
         * Initialize the chat interface
         */
        function initializeChat() {
            // Cache DOM elements
            elements = {
                chatMessages: document.getElementById('chatMessages'),
                messageInput: document.getElementById('messageInput'),
                sendBtn: document.getElementById('sendBtn'),
                speakBtn: document.getElementById('speakBtn'),
                readLastBtn: document.getElementById('readLastBtn'),
                autoSpeechBtn: document.getElementById('autoSpeechBtn'),
                clearChatBtn: document.getElementById('clearChatBtn')
            };

            // Event listeners
            elements.sendBtn.addEventListener('click', handleSendMessage);
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });
            elements.speakBtn.addEventListener('click', handleSpeechInput);
            elements.readLastBtn.addEventListener('click', handleReadLastResponse);
            elements.autoSpeechBtn.addEventListener('click', handleToggleAutoSpeech);
            elements.clearChatBtn.addEventListener('click', handleClearChat);

            // Update auto speech button state
            updateAutoSpeechButtonState();

            // Load chat history from localStorage
            loadChatHistory();

            // Check for browser support
            checkBrowserSupport();
        }

        /**
         * Check for required browser features
         */
        function checkBrowserSupport() {
            if (!window.speechSynthesis) {
                console.warn('Speech Synthesis not supported');
                elements.readLastBtn.disabled = true;
            }

            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                console.warn('Speech Recognition not supported');
                elements.speakBtn.disabled = true;
            }
        }

        /**
         * Handle sending a message
         */
        async function handleSendMessage() {
            const message = elements.messageInput.value.trim();

            if (!message || chatState.isLoading) {
                return;
            }

            // Clear input
            elements.messageInput.value = '';

            // Add user message to chat
            addMessageToChat(message, 'user');

            // Show loading state
            chatState.isLoading = true;
            elements.sendBtn.disabled = true;
            showTypingIndicator();

            try {
                // Send message to backend
                const response = await fetch(chatConfig.messageEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ message })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                removeTypingIndicator();

                if (data.response) {
                    // Add AI response to chat
                    addMessageToChat(data.response, 'assistant');
                    chatState.lastResponse = data.response;

                    // Save to localStorage
                    saveChatHistory();
                } else if (data.error) {
                    addMessageToChat(`Error: ${data.error}`, 'error');
                } else {
                    addMessageToChat('No response received. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                removeTypingIndicator();
                addMessageToChat(`Connection error: ${error.message}`, 'error');
            } finally {
                chatState.isLoading = false;
                elements.sendBtn.disabled = false;
                elements.messageInput.focus();
            }
        }

        /**
         * Format text for display with proper line breaks and styling
         */
        function formatTextForDisplay(text) {
            // Escape HTML entities while preserving line breaks
            const escapeHtml = (str) => {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };

            return text
                .split('\n')
                .map(line => {
                    line = line.trim();
                    if (!line) return '<br>';

                    // Format bullet points
                    if (line.startsWith('•')) {
                        return `<div class="bullet-item">${escapeHtml(line)}</div>`;
                    }

                    return `<div class="text-line">${escapeHtml(line)}</div>`;
                })
                .join('');
        }

        /**
         * Add a message to the chat display
         */
        function addMessageToChat(text, sender = 'user') {
            // Remove welcome message on first message
            const welcomeMsg = elements.chatMessages.querySelector('.chat-welcome');
            if (welcomeMsg && chatState.messages.length === 0) {
                welcomeMsg.remove();
            }

            // Create message element
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message chat-message-${sender}`;

            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';

            // For user messages, just use text; for assistant, format nicely
            if (sender === 'user') {
                messageContent.textContent = text;
            } else {
                messageContent.innerHTML = formatTextForDisplay(text);
            }

            messageDiv.appendChild(messageContent);

            // Add read button for assistant messages
            if (sender === 'assistant') {
                const readBtn = document.createElement('button');
                readBtn.className = 'message-read-btn';
                readBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                readBtn.title = 'Read message aloud';
                readBtn.addEventListener('click', () => {
                    speakText(text);
                });
                messageDiv.appendChild(readBtn);
            }

            elements.chatMessages.appendChild(messageDiv);

            // Scroll to bottom
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

            // Add to state
            if (chatState.messages.length < chatConfig.maxMessages) {
                chatState.messages.push({ text, sender, timestamp: new Date() });
            }

            // Auto-speak assistant messages if auto speech is enabled
            if (sender === 'assistant' && chatState.autoSpeech) {
                setTimeout(() => speakText(text), 500);
            }
        }

        /**
         * Show typing indicator
         */
        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'chat-message chat-message-typing';
            typingDiv.id = 'typingIndicator';

            const dotsDiv = document.createElement('div');
            dotsDiv.className = 'typing-dots';
            dotsDiv.innerHTML = '<span></span><span></span><span></span>';

            typingDiv.appendChild(dotsDiv);
            elements.chatMessages.appendChild(typingDiv);
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }

        /**
         * Remove typing indicator
         */
        function removeTypingIndicator() {
            const typingDiv = document.getElementById('typingIndicator');
            if (typingDiv) {
                typingDiv.remove();
            }
        }

        /**
         * Handle speech input
         */
        function handleSpeechInput() {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

            if (!SpeechRecognition) {
                alert('Speech Recognition not supported in your browser');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            elements.speakBtn.classList.add('listening');
            elements.speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }

                elements.messageInput.value = transcript;

                if (event.results[event.results.length - 1].isFinal) {
                    elements.speakBtn.classList.remove('listening');
                    elements.speakBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                elements.speakBtn.classList.remove('listening');
                elements.speakBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                alert(`Error: ${event.error}`);
            };

            recognition.onend = () => {
                elements.speakBtn.classList.remove('listening');
                elements.speakBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            };

            recognition.start();
        }

        /**
         * Speak text using Web Speech API with female voice
         */
        function speakText(text) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.5; // Higher pitch for female voice
            utterance.volume = 1.0;

            // Try to use a female voice
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(voice =>
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('samantha') ||
                voice.name.toLowerCase().includes('victoria') ||
                voice.name.toLowerCase().includes('moira') ||
                voice.name.toLowerCase().includes('karen') ||
                voice.name.toLowerCase().includes('zira')
            ) || voices.find(voice => voice.lang.startsWith('en-US') && voice.name.includes('Google')) || voices[0];

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            window.speechSynthesis.speak(utterance);
        }

        /**
         * Handle reading last response
         */
        function handleReadLastResponse() {
            if (chatState.lastResponse) {
                speakText(chatState.lastResponse);
            } else {
                alert('No response to read. Send a message first!');
            }
        }

        /**
         * Handle toggling auto speech feature
         */
        function handleToggleAutoSpeech() {
            chatState.autoSpeech = !chatState.autoSpeech;
            localStorage.setItem('autoSpeech', chatState.autoSpeech);
            updateAutoSpeechButtonState();
        }

        /**
         * Update auto speech button state
         */
        function updateAutoSpeechButtonState() {
            if (chatState.autoSpeech) {
                elements.autoSpeechBtn.classList.add('active');
                elements.autoSpeechBtn.innerHTML = '<i class="fas fa-volume-up"></i><span>Auto Speech</span>';
                elements.autoSpeechBtn.title = 'Auto speech is ON - responses will be read aloud';
            } else {
                elements.autoSpeechBtn.classList.remove('active');
                elements.autoSpeechBtn.innerHTML = '<i class="fas fa-volume-mute"></i><span>Auto Speech</span>';
                elements.autoSpeechBtn.title = 'Auto speech is OFF - click to enable';
            }
        }

        /**
         * Handle clearing chat
         */
        function handleClearChat() {
            if (confirm('Clear all chat messages?')) {
                chatState.messages = [];
                chatState.lastResponse = '';
                elements.chatMessages.innerHTML = `
                    <div class="chat-welcome">
                        <div class="welcome-icon">
                            <i class="fas fa-robot"></i>
                        </div>
                        <h3>Welcome to Dr. Synachat</h3>
                        <p>Ask me anything about your health. I'm here to help with personalized health guidance.</p>
                        <small>Note: I'm an AI assistant, not a replacement for professional medical advice.</small>
                    </div>
                `;
                saveChatHistory();
            }
        }

        /**
         * Save chat history to localStorage
         */
        function saveChatHistory() {
            try {
                localStorage.setItem('geminiChatHistory', JSON.stringify(chatState.messages));
            } catch (error) {
                console.warn('Could not save chat history:', error);
            }
        }

        /**
         * Load chat history from localStorage
         */
        function loadChatHistory() {
            try {
                const saved = localStorage.getItem('geminiChatHistory');
                if (saved) {
                    chatState.messages = JSON.parse(saved);

                    // Display saved messages
                    if (chatState.messages.length > 0) {
                        elements.chatMessages.innerHTML = '';
                        chatState.messages.forEach(msg => {
                            addMessageToChat(msg.text, msg.sender);
                        });

                        // Set last response
                        const lastAssistantMsg = chatState.messages.slice().reverse().find(m => m.sender === 'assistant');
                        if (lastAssistantMsg) {
                            chatState.lastResponse = lastAssistantMsg.text;
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not load chat history:', error);
            }
        }

        // Initialize on DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            initializeChat();
            // Avatar is initialized by avatar-loader.js
        });
    </script>
    <style>
        /* Avatar and Chat Wrapper */
        .avatar-chat-wrapper {
            display: flex;
            gap: var(--spacing-lg);
            padding: var(--spacing-lg);
            max-width: 1400px;
            margin: 0 auto;
            height: calc(100vh - 280px);
        }

        /* Avatar Section */
        .avatar-section {
            flex: 0 0 350px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-md);
            background: white;
            border-radius: var(--radius-lg);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            padding: var(--spacing-lg);
            overflow: hidden;
        }

        .avatar-container {
            width: 100%;
            height: 350px;
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, #f0f4f8 0%, #f9fafb 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .avatar-container canvas {
            width: 100%;
            height: 100%;
        }

        .avatar-info {
            text-align: center;
            margin-top: auto;
        }

        .avatar-info p {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        /* Chat Section */
        .chat-section {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
        }

        .chat-container {
            background: var(--white);
            border-radius: var(--radius-lg);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
        }

        /* Chat Header */
        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-md) var(--spacing-lg);
            border-bottom: 1px solid var(--border-color);
            background: linear-gradient(135deg, var(--primary-color) 0%, #667eea 100%);
            color: white;
        }

        .chat-header-content {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        .chat-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .chat-header-text h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .chat-header-text p {
            margin: 0;
            font-size: 0.85rem;
            opacity: 0.9;
        }

        .chat-header-actions {
            display: flex;
            gap: var(--spacing-sm);
        }

        .chat-action-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .chat-action-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        /* Chat Messages */
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: var(--spacing-lg);
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
            background: #f9fafb;
        }

        .chat-welcome {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: var(--spacing-xl);
            flex: 1;
            gap: var(--spacing-md);
            color: var(--text-secondary);
        }

        .welcome-icon {
            font-size: 3rem;
            color: var(--primary-color);
            opacity: 0.3;
        }

        .chat-welcome h3 {
            margin: var(--spacing-md) 0 var(--spacing-sm) 0;
            color: var(--text-primary);
            font-size: 1.25rem;
        }

        .chat-welcome p {
            margin: var(--spacing-sm) 0;
            line-height: 1.6;
            max-width: 400px;
        }

        .chat-welcome small {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-style: italic;
            margin-top: var(--spacing-sm);
        }

        .chat-message {
            display: flex;
            gap: var(--spacing-sm);
            align-items: flex-end;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .chat-message-user {
            justify-content: flex-end;
        }

        .chat-message-user .message-content {
            background: var(--primary-color);
            color: white;
            border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
        }

        .chat-message-assistant {
            justify-content: flex-start;
        }

        .chat-message-assistant .message-content {
            background: white;
            color: #8b5cf6;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
        }

        .chat-message-error {
            justify-content: center;
        }

        .chat-message-error .message-content {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
            border-radius: var(--radius-lg);
        }

        .chat-message-typing {
            justify-content: flex-start;
        }

        .message-content {
            max-width: 70%;
            padding: var(--spacing-sm) var(--spacing-md);
            word-wrap: break-word;
            line-height: 1.5;
            font-size: 0.95rem;
            font-weight: 500;
        }

        .text-line {
            margin: var(--spacing-xs) 0;
        }

        .bullet-item {
            margin: var(--spacing-xs) 0;
            margin-left: var(--spacing-md);
        }

        .message-read-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            color: var(--text-secondary);
            transition: all 0.2s ease;
            opacity: 0;
            margin-left: var(--spacing-xs);
        }

        .chat-message-assistant:hover .message-read-btn {
            opacity: 1;
        }

        .message-read-btn:hover {
            background: var(--primary-color);
            color: white;
            transform: scale(1.1);
        }

        /* Typing Indicator */
        .typing-dots {
            display: flex;
            gap: 4px;
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--primary-color);
            animation: bounce 1.4s infinite;
        }

        .typing-dots span:nth-child(1) {
            animation-delay: -0.32s;
        }

        .typing-dots span:nth-child(2) {
            animation-delay: -0.16s;
        }

        @keyframes bounce {

            0%,
            60%,
            100% {
                transform: translateY(0);
                opacity: 0.7;
            }

            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }

        /* Chat Input Section */
        .chat-input-wrapper {
            padding: var(--spacing-lg);
            border-top: 1px solid var(--border-color);
            background: white;
        }

        .chat-input-container {
            display: flex;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
        }

        .chat-input {
            flex: 1;
            padding: var(--spacing-sm) var(--spacing-md);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: 0.95rem;
            transition: border-color 0.2s ease;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }

        .send-btn,
        .speak-btn {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            transition: all 0.2s ease;
        }

        .send-btn {
            background: var(--primary-color);
            color: white;
        }

        .send-btn:hover:not(:disabled) {
            background: var(--primary-dark);
            transform: scale(1.05);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .speak-btn {
            background: var(--border-color);
            color: var(--text-secondary);
        }

        .speak-btn:hover:not(:disabled) {
            background: var(--text-secondary);
            color: white;
            transform: scale(1.05);
        }

        .speak-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .speak-btn.listening {
            background: #ef4444;
            color: white;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }

            50% {
                box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
            }
        }

        /* Chat Controls */
        .chat-controls {
            display: flex;
            gap: var(--spacing-sm);
            justify-content: flex-end;
        }

        .control-btn {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-md);
            border: 1px solid var(--primary-color);
            border-radius: var(--radius-md);
            background: rgba(var(--primary-rgb), 0.05);
            color: #8b5cf6;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }

        .control-btn:hover:not(:disabled) {
            border-color: var(--primary-color);
            color: white;
            background: var(--primary-color);
        }

        .control-btn.active {
            border-color: var(--primary-color);
            color: white;
            background: var(--primary-color);
        }

        .control-btn.active:hover:not(:disabled) {
            background: var(--primary-dark);
            border-color: var(--primary-dark);
            transform: scale(1.05);
        }

        .control-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .avatar-chat-wrapper {
                flex-wrap: wrap;
                height: auto;
                gap: var(--spacing-md);
            }

            .avatar-section {
                flex: 0 0 100%;
            }

            .avatar-container {
                height: 250px;
            }

            .chat-section {
                flex: 0 0 100%;
                min-height: 500px;
            }

            .chat-container {
                height: 100%;
            }
        }

        @media (max-width: 768px) {
            .avatar-chat-wrapper {
                padding: var(--spacing-md);
                flex-direction: column;
            }

            .avatar-section {
                flex: 0 0 auto;
                width: 100%;
            }

            .avatar-container {
                height: 250px;
            }

            .chat-section {
                flex: 0 0 auto;
                width: 100%;
                min-height: 400px;
            }

            .chat-container {
                height: 100%;
            }

            .message-content {
                max-width: 85%;
            }

            .chat-message-user .message-content {
                max-width: 100%;
            }

            .chat-header {
                padding: var(--spacing-md);
            }

            .chat-messages {
                padding: var(--spacing-md);
            }

            .chat-input-wrapper {
                padding: var(--spacing-md);
            }
        }

        /* Scrollbar Styling */
        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
            background: var(--text-secondary);
        }
    </style>
</body>

</html>