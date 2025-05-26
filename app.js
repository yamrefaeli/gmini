class GeminiClone {
    constructor() {
        this.currentChatId = null;
        this.chats = JSON.parse(localStorage.getItem('gemini-chats') || '{}');
        this.apiKey = localStorage.getItem('gemini-api-key') || '';
        this.currentModel = localStorage.getItem('gemini-model') || 'gemini-2.0-flash-exp';
        this.settings = JSON.parse(localStorage.getItem('gemini-settings') || JSON.stringify({
            temperature: 0.7,
            maxTokens: 2048,
            topP: 0.95,
            topK: 40,
            streamResponse: true,
            includeChatHistory: true
        }));
        this.systemPrompt = localStorage.getItem('gemini-system-prompt') || '';
        this.systemPromptTemplate = localStorage.getItem('gemini-system-prompt-template') || '';
        this.isLoading = false;
        this.isLuxuryMode = localStorage.getItem('luxury-mode') === 'true';
        this.abortController = null;
        this.files = [];
        this.generationProgress = 0;
        this.progressInterval = null;

        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.setupAutoResize();
        this.loadTheme();
        this.loadLuxuryMode();
        this.initializeQuickActions();
        this.initializeExportOptions();
    }

    initializeElements() {
        // Main UI elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('historyList');
        this.themeToggle = document.getElementById('themeToggle');
        this.luxuryToggle = document.getElementById('luxuryToggle');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.exportDropdownBtn = document.getElementById('exportDropdownBtn');
        this.exportDropdownContent = document.getElementById('exportDropdownContent');
        
        // API & Model Settings
        this.geminiApiKey = document.getElementById('geminiApiKey');
        this.geminiModel = document.getElementById('geminiModel');
        this.systemPromptInput = document.getElementById('systemPrompt');
        this.systemPromptTemplateSelect = document.getElementById('systemPromptTemplate');
        this.temperatureSlider = document.getElementById('temperature');
        this.maxTokensSlider = document.getElementById('maxTokens');
        this.topPSlider = document.getElementById('topP');
        this.topKSlider = document.getElementById('topK');
        this.streamResponseCheckbox = document.getElementById('streamResponse');
        this.includeChatHistoryCheckbox = document.getElementById('includeChatHistory');
        this.tempValue = document.getElementById('tempValue');
        this.maxTokensValue = document.getElementById('maxTokensValue');
        this.topPValue = document.getElementById('topPValue');
        this.topKValue = document.getElementById('topKValue');
        this.apiStatus = document.getElementById('apiStatus');
        
        // Chat Interface
        this.mainContent = document.getElementById('mainContent');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatTitle = document.getElementById('chatTitle');
        this.shareBtn = document.getElementById('shareBtn');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.charCount = document.getElementById('charCount');
        this.modelInfo = document.getElementById('modelInfo');
        this.attachBtn = document.getElementById('attachBtn');
        this.micBtn = document.getElementById('micBtn');
        
        // Loading & Notifications
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.loadingProgress = document.getElementById('loadingProgress');
        this.toastContainer = document.getElementById('toastContainer');
        
        // Context Menu & File Handling
        this.contextMenu = document.getElementById('contextMenu');
        this.filePreviewList = document.getElementById('filePreviewList');
        
        // Export Modal
        this.exportModal = document.getElementById('exportModal');
        this.closeExportModal = document.getElementById('closeExportModal');
        this.cancelExport = document.getElementById('cancelExport');
        this.confirmExport = document.getElementById('confirmExport');
        this.includeTimestampsCheckbox = document.getElementById('includeTimestamps');
        this.includeSystemPromptsCheckbox = document.getElementById('includeSystemPrompts');
    }

    bindEvents() {
        // Sidebar controls
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.luxuryToggle.addEventListener('click', () => this.toggleLuxuryMode());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.exportBtn.addEventListener('click', () => this.showExportModal());
        
        // Settings controls
        this.geminiApiKey.addEventListener('input', (e) => this.saveApiKey(e.target.value));
        this.geminiModel.addEventListener('change', (e) => this.changeModel(e.target.value));
        this.systemPromptTemplateSelect.addEventListener('change', (e) => this.changeSystemPromptTemplate(e.target.value));
        this.systemPromptInput.addEventListener('input', (e) => this.saveSystemPrompt(e.target.value));
        this.temperatureSlider.addEventListener('input', (e) => this.updateTemperature(e.target.value));
        this.maxTokensSlider.addEventListener('input', (e) => this.updateMaxTokens(e.target.value));
        this.topPSlider.addEventListener('input', (e) => this.updateTopP(e.target.value));
        this.topKSlider.addEventListener('input', (e) => this.updateTopK(e.target.value));
        this.streamResponseCheckbox.addEventListener('change', (e) => this.updateStreamResponse(e.target.checked));
        this.includeChatHistoryCheckbox.addEventListener('change', (e) => this.updateIncludeChatHistory(e.target.checked));
        
        // Chat actions
        this.shareBtn.addEventListener('click', () => this.shareChat());
        this.regenerateBtn.addEventListener('click', () => this.regenerateLastResponse());
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.stopBtn.addEventListener('click', () => this.abortGeneration());
        
        // Export dropdown
        this.exportDropdownBtn.addEventListener('click', () => {
            this.exportDropdownContent.classList.toggle('show');
        });
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-format');
                this.exportChat(format);
                if (this.exportDropdownContent.classList.contains('show')) {
                    this.exportDropdownContent.classList.remove('show');
                }
            });
        });
        
        // Export modal
        this.closeExportModal.addEventListener('click', () => this.hideExportModal());
        this.cancelExport.addEventListener('click', () => this.hideExportModal());
        this.confirmExport.addEventListener('click', () => {
            const format = document.querySelector('.export-option.selected')?.getAttribute('data-format') || 'pdf';
            const includeTimestamps = this.includeTimestampsCheckbox.checked;
            const includeSystemPrompts = this.includeSystemPromptsCheckbox.checked;
            this.exportChat(format, includeTimestamps, includeSystemPrompts);
            this.hideExportModal();
        });
        
        // Suggestion cards
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                this.messageInput.value = prompt;
                this.updateCharCount();
                this.sendMessage();
            });
        });
        
        // File handling
        this.attachBtn.addEventListener('click', () => this.handleAttachment());
        this.micBtn.addEventListener('click', () => this.toggleVoiceRecording());
        
        // Context menu
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('click', (e) => {
            if (!this.exportDropdownBtn.contains(e.target)) {
                this.exportDropdownContent.classList.remove('show');
            }
        });
        
        // Global shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalShortcuts(e));
        
        // Drag & drop
        this.messageInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.add('dragover');
        });
        this.messageInput.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.remove('dragover');
        });
        this.messageInput.addEventListener('drop', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.remove('dragover');
            this.handleDropFiles(e.dataTransfer.files);
        });
    }

    inputWrapper() {
        return this.messageInput.closest('.input-wrapper');
    }

    loadSettings() {
        // Load API key and model settings
        this.geminiApiKey.value = this.apiKey;
        this.geminiModel.value = this.currentModel;
        
        // Load system prompt
        this.systemPromptInput.value = this.systemPrompt;
        this.systemPromptTemplateSelect.value = this.systemPromptTemplate;
        
        // Load advanced settings
        this.temperatureSlider.value = this.settings.temperature;
        this.maxTokensSlider.value = this.settings.maxTokens;
        this.topPSlider.value = this.settings.topP || 0.95;
        this.topKSlider.value = this.settings.topK || 40;
        this.streamResponseCheckbox.checked = this.settings.streamResponse !== false;
        this.includeChatHistoryCheckbox.checked = this.settings.includeChatHistory !== false;
        
        // Update display values
        this.tempValue.textContent = this.settings.temperature;
        this.maxTokensValue.textContent = this.settings.maxTokens;
        this.topPValue.textContent = this.settings.topP || 0.95;
        this.topKValue.textContent = this.settings.topK || 40;
        this.modelInfo.textContent = this.getModelDisplayName(this.currentModel);
        
        // Validate API key if present
        if (this.apiKey) this.validateApiKey();
        
        // Render chat history
        this.renderChatHistory();
    }

    getModelDisplayName(modelId) {
        const models = {
            'gemini-2.0-flash-exp': 'Gemini 2.0 Flash Experimental',
            'gemini-1.5-flash': 'Gemini 1.5 Flash',
            'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B',
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
            'gemini-1.0-pro': 'Gemini 1.0 Pro'
        };
        return models[modelId] || modelId;
    }

    async validateApiKey() {
        if (!this.apiKey) return;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (response.ok) {
                this.showApiStatus('API Key תקף ומחובר', 'success');
            } else {
                this.showApiStatus('API Key לא תקף', 'error');
            }
        } catch (error) {
            this.showApiStatus('שגיאה בבדיקת API Key', 'error');
        }
    }

    showApiStatus(message, type) {
        this.apiStatus.textContent = message;
        this.apiStatus.className = `api-status ${type}`;
        this.apiStatus.style.display = 'block';
    }

    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini-api-key', key);
        if (key.trim()) {
            this.validateApiKey();
            this.showToast('API Key נשמר בהצלחה', 'success');
        } else {
            this.apiStatus.style.display = 'none';
        }
    }

    changeModel(model) {
        this.currentModel = model;
        localStorage.setItem('gemini-model', model);
        this.modelInfo.textContent = this.getModelDisplayName(model);
        this.showToast(`עבר למודל ${this.getModelDisplayName(model)}`, 'success');
    }

    changeSystemPromptTemplate(template) {
        this.systemPromptTemplate = template;
        localStorage.setItem('gemini-system-prompt-template', template);
        
        // Set predefined system prompts based on template selection
        let promptText = '';
        switch (template) {
            case 'expert':
                promptText = 'פעל כמומחה בתחום ותן תשובות מעמיקות ומפורטות המבוססות על ידע מקצועי.';
                break;
            case 'creative':
                promptText = 'היה יצירתי מאוד בתשובותיך, הצע רעיונות מקוריים וחדשניים, והשתמש בשפה עשירה וציורית.';
                break;
            case 'concise':
                promptText = 'תן תשובות קצרות, תמציתיות וממוקדות. הימנע מפרטים מיותרים ושמור על בהירות.';
                break;
            case 'code':
                promptText = 'פעל כמתכנת מקצועי. ספק קוד יעיל ומתועד היטב, כולל הסברים ברורים על הפתרון שבחרת.';
                break;
            case 'custom':
                // Keep the current custom prompt if it exists
                promptText = this.systemPrompt;
                break;
            default:
                promptText = '';
        }
        
        this.systemPromptInput.value = promptText;
        this.saveSystemPrompt(promptText);
        
        // Only show the system prompt textarea for custom prompts
        if (template === 'custom') {
            this.systemPromptInput.style.display = 'block';
        } else {
            this.systemPromptInput.style.display = template ? 'none' : 'block';
        }
    }

    saveSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        localStorage.setItem('gemini-system-prompt', prompt);
    }

    updateTemperature(value) {
        this.settings.temperature = parseFloat(value);
        this.tempValue.textContent = value;
        this.saveSettings();
    }

    updateMaxTokens(value) {
        this.settings.maxTokens = parseInt(value);
        this.maxTokensValue.textContent = value;
        this.saveSettings();
    }

    updateTopP(value) {
        this.settings.topP = parseFloat(value);
        this.topPValue.textContent = value;
        this.saveSettings();
    }

    updateTopK(value) {
        this.settings.topK = parseInt(value);
        this.topKValue.textContent = value;
        this.saveSettings();
    }

    updateStreamResponse(checked) {
        this.settings.streamResponse = checked;
        this.saveSettings();
    }

    updateIncludeChatHistory(checked) {
        this.settings.includeChatHistory = checked;
        this.saveSettings();
    }

    saveSettings() {
        localStorage.setItem('gemini-settings', JSON.stringify(this.settings));
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        this.mainContent.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', this.sidebar.classList.contains('collapsed'));
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('gemini-theme', newTheme);
        const icon = this.themeToggle.querySelector('.material-icons');
        icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    toggleLuxuryMode() {
        this.isLuxuryMode = !this.isLuxuryMode;
        document.documentElement.setAttribute('data-luxury', this.isLuxuryMode ? 'true' : 'false');
        localStorage.setItem('luxury-mode', this.isLuxuryMode ? 'true' : 'false');
        this.showToast(this.isLuxuryMode ? 'מצב יוקרתי הופעל' : 'מצב יוקרתי כבוי', 'success');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('gemini-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = this.themeToggle.querySelector('.material-icons');
        icon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
        const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (sidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.mainContent.classList.add('sidebar-collapsed');
        }
    }

    loadLuxuryMode() {
        document.documentElement.setAttribute('data-luxury', this.isLuxuryMode ? 'true' : 'false');
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
        });
    }

    initializeExportOptions() {
        document.querySelectorAll('#exportModal .export-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('#exportModal .export-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            });
        });
    }

    showExportModal() {
        if (!this.currentChatId) {
            this.showToast('אין צ\'אט לייצוא', 'error');
            return;
        }
        
        // Reset selections
        document.querySelectorAll('#exportModal .export-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector('#exportModal .export-option[data-format="pdf"]').classList.add('selected');
        
        this.exportModal.classList.add('visible');
    }

    hideExportModal() {
        this.exportModal.classList.remove('visible');
    }

    updateCharCount() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length}/8000`;
        this.sendBtn.disabled = length === 0 || this.isLoading;
        if (length > 7000) {
            this.charCount.style.color = 'var(--accent-color)';
        } else {
            this.charCount.style.color = 'var(--text-tertiary)';
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.isLoading && this.messageInput.value.trim()) {
                this.sendMessage();
            }
        } else if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (!this.isLoading && this.messageInput.value.trim()) {
                this.sendMessage();
            }
        }
    }

    handleGlobalShortcuts(e) {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.startNewChat();
        } else if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            this.toggleSidebar();
        } else if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            this.showExportModal();
        }
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        this.chats[this.currentChatId] = {
            id: this.currentChatId,
            title: 'צ\'אט חדש',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            model: this.currentModel,
            systemPrompt: this.systemPrompt
        };
        this.saveChatData();
        this.showChatInterface();
        this.renderChatHistory();
        this.updateChatTitle('צ\'אט חדש');
        this.messageInput.focus();
        this.files = [];
        this.renderFilePreview();
    }

    showChatInterface() {
        this.welcomeScreen.style.display = 'none';
        this.chatMessages.classList.add('active');
        this.chatMessages.style.display = 'block';
        this.renderMessages();
    }

    updateChatTitle(title) {
        this.chatTitle.textContent = title;
        if (this.currentChatId && this.chats[this.currentChatId]) {
            this.chats[this.currentChatId].title = title;
            this.saveChatData();
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;
        if (!this.apiKey) {
            this.showToast('אנא הזן API Key עבור Gemini', 'error');
            return;
        }
        if (!this.currentChatId) {
            this.startNewChat();
        }
        
        const userMessage = {
            id: this.generateMessageId(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            files: this.files.map(f => ({ name: f.name, size: f.size, type: f.type }))
        };
        
        this.chats[this.currentChatId].messages.push(userMessage);
        this.chats[this.currentChatId].updatedAt = new Date().toISOString();
        
        // Update chat title with first message
        if (this.chats[this.currentChatId].messages.length === 1) {
            const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            this.chats[this.currentChatId].title = title;
            this.updateChatTitle(title);
        }
        
        this.saveChatData();
        this.renderMessages();
        this.renderChatHistory();
        this.messageInput.value = '';
        this.updateCharCount();
        this.messageInput.style.height = 'auto';
        this.files = [];
        this.renderFilePreview();
        
        this.setLoading(true);
        this.startFakeProgressBar();
        this.showLoadingSteps();
        this.abortController = new AbortController();
        
        try {
            const response = await this.callGemini(message, this.abortController.signal);
            const assistantMessage = {
                id: this.generateMessageId(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: this.currentModel
            };
            
            this.chats[this.currentChatId].messages.push(assistantMessage);
            this.chats[this.currentChatId].updatedAt = new Date().toISOString();
            this.saveChatData();
            this.renderMessages();
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('התגובה הופסקה', 'error');
            } else {
                this.showToast('שגיאה בשליחת ההודעה: ' + error.message, 'error');
                console.error('API Error:', error);
            }
        } finally {
            this.setLoading(false);
            this.stopFakeProgressBar();
        }
        
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    startFakeProgressBar() {
        this.generationProgress = 0;
        this.updateProgressDisplay();
        
        // Calculate approximate time based on message length and complexity
        const messageLength = this.messageInput.value.length;
        const complexity = messageLength > 500 ? 1.5 : 1;
        const totalUpdates = 20; // Number of progress updates
        const totalTime = Math.min(Math.max(messageLength * complexity * 15, 3000), 8000); // Between 3 and 8 seconds
        const updateInterval = totalTime / totalUpdates;
        
        this.progressInterval = setInterval(() => {
            // Use a non-linear progression for more realistic feeling
            if (this.generationProgress < 30) {
                this.generationProgress += 3;
            } else if (this.generationProgress < 60) {
                this.generationProgress += 2;
            } else if (this.generationProgress < 85) {
                this.generationProgress += 1;
            } else if (this.generationProgress < 95) {
                this.generationProgress += 0.5;
            }
            
            // Cap at 95% until complete
            this.generationProgress = Math.min(this.generationProgress, 95);
            this.updateProgressDisplay();
        }, updateInterval);
    }

    stopFakeProgressBar() {
        clearInterval(this.progressInterval);
        this.generationProgress = 100;
        this.updateProgressDisplay();
    }

    updateProgressDisplay() {
        if (this.loadingProgress) {
            this.loadingProgress.textContent = `${Math.round(this.generationProgress)}%`;
        }
    }

    showLoadingSteps() {
        const steps = document.querySelectorAll('.step');
        let currentStep = 0;
        const stepMessages = [
            'מנתח את השאלה...',
            'מחפש מידע רלוונטי...',
            'מכין תשובה מקיפה...'
        ];
        
        const interval = setInterval(() => {
            if (currentStep > 0) steps[currentStep - 1].classList.remove('active');
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('active');
                this.loadingMessage.textContent = stepMessages[currentStep];
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 1000);
        
        this.loadingInterval = interval;
    }

    async callGemini(message, signal) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent?key=${this.apiKey}`;
        
        // Build conversation history based on settings
        let conversationHistory = [];
        if (this.settings.includeChatHistory) {
            conversationHistory = this.chats[this.currentChatId].messages.slice(-10);
        }
        
        // Format messages for the API
        const messages = conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        
        // Add system prompt if available
        if (this.systemPrompt) {
            messages.unshift({
                role: 'user',
                parts: [{ text: `System: ${this.systemPrompt}` }]
            });
        }
        
        // Add current message
        messages.push({
            role: 'user',
            parts: [{ text: message }]
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    temperature: this.settings.temperature,
                    topK: this.settings.topK,
                    topP: this.settings.topP,
                    maxOutputTokens: this.settings.maxTokens,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ]
            }),
            signal
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API Error');
        }
        
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('תגובה לא תקינה מ-Gemini API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }

    abortGeneration() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.stopFakeProgressBar();
            this.setLoading(false);
        }
    }

    renderMessages() {
        if (!this.currentChatId || !this.chats[this.currentChatId]) {
            this.chatMessages.innerHTML = '';
            return;
        }
        
        const messages = this.chats[this.currentChatId].messages;
        this.chatMessages.innerHTML = messages.map(message => this.createMessageHTML(message)).join('');
        this.bindMessageActions();
        Prism.highlightAll();
    }

    createMessageHTML(message) {
        const isUser = message.role === 'user';
        const time = new Date(message.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const avatar = isUser ? '<span>אתה</span>' : '<span class="material-icons">auto_awesome</span>';
        const senderName = isUser ? 'אתה' : 'Gemini';
        
        let filesHtml = '';
        if (isUser && message.files && message.files.length) {
            filesHtml = `<div class="file-preview-list" style="margin-top:8px;">` +
                message.files.map(f =>
                    `<div class="file-preview">
                        <span class="material-icons">${this.getFileIcon(f)}</span>
                        <span title="${f.name}">${f.name.length > 18 ? f.name.slice(0,15)+'...' : f.name}</span>
                        <span>(${this.formatFileSize(f.size)})</span>
                    </div>`
                ).join('') + `</div>`;
        }
        
        return `
            <div class="message ${message.role}" data-message-id="${message.id}">
                <div class="message-header">
                    <div class="message-avatar">${avatar}</div>
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${time}</span>
                    ${message.model ? `<span class="message-model">${this.getModelDisplayName(message.model)}</span>` : ''}
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                    ${filesHtml}
                </div>
                <div class="message-actions">
                    ${!isUser ? `
                        <button class="action-btn-small copy-btn" title="העתק">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button class="action-btn-small share-btn" title="שתף">
                            <span class="material-icons">share</span>
                        </button>
                        <button class="action-btn-small delete-btn" title="מחק">
                            <span class="material-icons">delete</span>
                        </button>
                    ` : `
                        <button class="action-btn-small edit-btn" title="ערוך">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="action-btn-small delete-btn" title="מחק">
                            <span class="material-icons">delete</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    formatMessageContent(content) {
        // Improved code handling with proper line breaks
        let formatted = content;
        
        // Code blocks - preserving actual line breaks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            lang = lang || 'javascript';
            // Don't convert to entities before Prism
            return `<pre class="code-block"><code class="language-${lang}">${code}</code>
                <button class="copy-code-btn" title="העתק קוד"><span class="material-icons">content_copy</span></button>
            </pre>`;
        });
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Links
        formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Headings
        formatted = formatted.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        
        // Lists - improved to properly handle multi-level lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        
        // Emphasis
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Underline
        formatted = formatted.replace(/__(.*?)__/g, '<u>$1</u>');
        
        // Tables - improved for better parsing
        formatted = formatted.replace(/((?:\|.+\|(?:\n|$))+)/g, (table) => {
            const rows = table.trim().split('\n');
            let tableHtml = '<table>';
            
            // Check for header row
            if (rows.length > 1 && rows[1].replace(/[^|]/g, '') === rows[1]) {
                // Has header separator
                tableHtml += '<thead><tr>' + 
                    rows[0].split('|').filter(Boolean).map(cell => `<th>${cell.trim()}</th>`).join('') + 
                    '</tr></thead><tbody>';
                
                // Add data rows starting from index 2
                for (let i = 2; i < rows.length; i++) {
                    tableHtml += '<tr>' + 
                        rows[i].split('|').filter(Boolean).map(cell => `<td>${cell.trim()}</td>`).join('') + 
                        '</tr>';
                }
                tableHtml += '</tbody>';
            } else {
                // No header, all rows are data
                for (const row of rows) {
                    tableHtml += '<tr>' + 
                        row.split('|').filter(Boolean).map(cell => `<td>${cell.trim()}</td>`).join('') + 
                        '</tr>';
                }
            }
            
            return tableHtml + '</table>';
        });
        
        // Line breaks (only outside code blocks)
        formatted = formatted.replace(/(?<!<\/pre>)\n/g, '<br>');
        
        return formatted;
    }

    bindMessageActions() {
        // Copy code button functionality
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.onclick = (e) => {
                const code = btn.parentElement.querySelector('code').innerText;
                navigator.clipboard.writeText(code);
                this.showToast('הקוד הועתק', 'success');
                e.stopPropagation();
            };
        });
        
        // Copy message button
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msg = btn.closest('.message').querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('הועתק ללוח', 'success');
                e.stopPropagation();
            };
        });
        
        // Share message button
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msg = btn.closest('.message').querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('ההודעה הועתקה לשיתוף', 'success');
                e.stopPropagation();
            };
        });
        
        // Delete message button
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msgEl = btn.closest('.message');
                const messageId = msgEl.getAttribute('data-message-id');
                this.deleteMessage(messageId);
                e.stopPropagation();
            };
        });
        
        // Edit message button
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msgEl = btn.closest('.message');
                const messageId = msgEl.getAttribute('data-message-id');
                this.editMessage(messageId);
                e.stopPropagation();
            };
        });
    }

    editMessage(messageId) {
        if (!this.currentChatId) return;
        
        const messages = this.chats[this.currentChatId].messages;
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            const message = messages[messageIndex];
            
            // Only edit user messages
            if (message.role === 'user') {
                this.messageInput.value = message.content;
                this.updateCharCount();
                this.messageInput.focus();
                
                // Remove the message and all subsequent messages
                this.chats[this.currentChatId].messages = messages.slice(0, messageIndex);
                this.saveChatData();
                this.renderMessages();
                this.showToast('ערוך את ההודעה ושלח שוב', 'success');
            }
        }
    }

    deleteMessage(messageId) {
        if (!this.currentChatId) return;
        
        const messages = this.chats[this.currentChatId].messages;
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            // If deleting user message, also delete the assistant's response
            if (messages[messageIndex].role === 'user' && messageIndex + 1 < messages.length && 
                messages[messageIndex + 1].role === 'assistant') {
                messages.splice(messageIndex, 2);
            } else {
                messages.splice(messageIndex, 1);
            }
            
            this.saveChatData();
            this.renderMessages();
            this.showToast('ההודעה נמחקה', 'success');
        }
    }

    renderChatHistory() {
        const sortedChats = Object.values(this.chats)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        this.chatHistory.innerHTML = sortedChats.map(chat => `
            <div class="history-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 data-chat-id="${chat.id}">
                <div class="history-item-title">${chat.title}</div>
                <div class="history-item-preview">
                    ${this.getChatSummary(chat)}
                </div>
                <button class="delete-chat-btn" data-chat-id="${chat.id}" title="מחק צ'אט">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `).join('');
        
        // Add event listeners for chat items
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat-btn')) {
                    const chatId = item.getAttribute('data-chat-id');
                    this.loadChat(chatId);
                }
            });
        });
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chatId = btn.getAttribute('data-chat-id');
                this.deleteChat(chatId);
            });
        });
    }

    getChatSummary(chat) {
        if (!chat.messages || chat.messages.length === 0) return 'שיחה חדשה';
        const firstUserMsg = chat.messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            let summary = firstUserMsg.content.split('\n')[0];
            if (summary.length > 40) summary = summary.substring(0, 40) + '...';
            return summary;
        }
        return chat.title;
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        this.showChatInterface();
        this.updateChatTitle(chat.title);
        this.renderChatHistory();
        this.files = [];
        this.renderFilePreview();
    }

    deleteChat(chatId) {
        if (confirm('האם אתה בטוח שברצונך למחוק את הצ\'אט הזה?')) {
            delete this.chats[chatId];
            this.saveChatData();
            
            // If deleted the current chat, show welcome screen
            if (chatId === this.currentChatId) {
                this.currentChatId = null;
                this.welcomeScreen.style.display = 'flex';
                this.chatMessages.style.display = 'none';
                this.chatMessages.classList.remove('active');
                this.updateChatTitle('צ\'אט חדש');
            }
            
            this.renderChatHistory();
            this.showToast('הצ\'אט נמחק', 'success');
        }
    }

    clearHistory() {
        if (confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?')) {
            this.chats = {};
            this.currentChatId = null;
            localStorage.removeItem('gemini-chats');
            this.renderChatHistory();
            this.welcomeScreen.style.display = 'flex';
            this.chatMessages.style.display = 'none';
            this.chatMessages.classList.remove('active');
            this.updateChatTitle('צ\'אט חדש');
            this.showToast('ההיסטוריה נמחקה', 'success');
        }
    }

    shareChat() {
        if (!this.currentChatId) {
            this.showToast('אין צ\'אט לשיתוף', 'error');
            return;
        }
        
        const chat = this.chats[this.currentChatId];
        const chatText = chat.messages.map(msg =>
            `${msg.role === 'user' ? 'אתה' : 'Gemini'}: ${msg.content}`
        ).join('\n\n');
        
        navigator.clipboard.writeText(chatText).then(() => {
            this.showToast('הצ\'אט הועתק ללוח', 'success');
        });
    }

    exportChat(format = 'pdf', includeTimestamps = true, includeSystemPrompts = false) {
        if (!this.currentChatId) {
            this.showToast('אין צ\'אט לייצוא', 'error');
            return;
        }
        
        const chat = this.chats[this.currentChatId];
        
        switch (format) {
            case 'pdf':
                this.exportToPdf(chat, includeTimestamps, includeSystemPrompts);
                break;
            case 'docx':
                this.exportToDocx(chat, includeTimestamps, includeSystemPrompts);
                break;
            case 'txt':
                this.exportToText(chat, includeTimestamps, includeSystemPrompts);
                break;
            default:
                this.exportToPdf(chat, includeTimestamps, includeSystemPrompts);
        }
    }

    exportToPdf(chat, includeTimestamps, includeSystemPrompts) {
        // Using jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set up the document with RTL support
        doc.setFont("Helvetica");
        doc.setFontSize(20);
        doc.text(chat.title, 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        let y = 40;
        
        // Add system prompt if requested
        if (includeSystemPrompts && chat.systemPrompt) {
            doc.setFont("Helvetica", "italic");
            doc.text("System Prompt:", 20, y);
            y += 7;
            doc.setFont("Helvetica", "normal");
            
            const systemPromptLines = doc.splitTextToSize(chat.systemPrompt, 170);
            doc.text(systemPromptLines, 20, y);
            y += systemPromptLines.length * 7 + 10;
        }
        
        // Add each message
        for (const msg of chat.messages) {
            const role = msg.role === 'user' ? 'אתה' : 'Gemini';
            
            doc.setFont("Helvetica", "bold");
            doc.text(role, 20, y);
            
            if (includeTimestamps) {
                const time = new Date(msg.timestamp).toLocaleString('he-IL');
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(time, 190, y, { align: 'right' });
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
            }
            
            y += 7;
            
            // Clean content (remove markdown and HTML)
            const content = msg.content.replace(/```[\s\S]*?```/g, '[CODE BLOCK]')
                                      .replace(/<[^>]*>/g, '')
                                      .replace(/\!\[.*?\]\(.*?\)/g, '[IMAGE]')
                                      .replace(/\[.*?\]\(.*?\)/g, '[LINK]');
            
            // Split text to fit page width
            const contentLines = doc.splitTextToSize(content, 170);
            
            // Check if we need a new page
            if (y + contentLines.length * 7 > 280) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFont("Helvetica", "normal");
            doc.text(contentLines, 20, y);
            y += contentLines.length * 7 + 10;
            
            // Check if we need a new page for the next message
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
        }
        
        // Add footer
        const date = new Date().toLocaleString('he-IL');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`יוצא ב: ${date}`, 20, 290);
        doc.text("Gemini Clone", 190, 290, { align: 'right' });
        
        // Save the PDF
        doc.save(`chat_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        this.showToast('הצ\'אט יוצא בהצלחה ל-PDF', 'success');
    }

    exportToDocx(chat, includeTimestamps, includeSystemPrompts) {
        // For simplicity, we'll create a formatted HTML and let the browser handle the download
        let html = `<!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${chat.title}</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; }
                .title { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                .message { margin-bottom: 20px; }
                .user { color: #4285f4; font-weight: bold; }
                .assistant { color: #34a853; font-weight: bold; }
                .timestamp { color: #888; font-size: 12px; }
                .content { margin-top: 5px; white-space: pre-wrap; }
                .system-prompt { font-style: italic; background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="title">${chat.title}</div>`;
        
        if (includeSystemPrompts && chat.systemPrompt) {
            html += `<div class="system-prompt">
                <div>System Prompt:</div>
                <div>${chat.systemPrompt}</div>
            </div>`;
        }
        
        for (const msg of chat.messages) {
            const role = msg.role === 'user' ? 'אתה' : 'Gemini';
            const roleClass = msg.role === 'user' ? 'user' : 'assistant';
            
            html += `<div class="message">
                <div>
                    <span class="${roleClass}">${role}</span>`;
            
            if (includeTimestamps) {
                const time = new Date(msg.timestamp).toLocaleString('he-IL');
                html += `<span class="timestamp"> (${time})</span>`;
            }
            
            // Sanitize content but preserve line breaks
            const sanitizedContent = msg.content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
                
            html += `</div>
                <div class="content">${sanitizedContent}</div>
            </div>`;
        }
        
        html += `</body></html>`;
        
        // Create a Blob and download
        const blob = new Blob([html], { type: 'application/vnd.ms-word' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `chat_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
        link.click();
        
        this.showToast('הצ\'אט יוצא בהצלחה ל-Word', 'success');
    }

    exportToText(chat, includeTimestamps, includeSystemPrompts) {
        let text = `${chat.title}\n\n`;
        
        if (includeSystemPrompts && chat.systemPrompt) {
            text += `System Prompt: ${chat.systemPrompt}\n\n`;
        }
        
        for (const msg of chat.messages) {
            const role = msg.role === 'user' ? 'אתה' : 'Gemini';
            
            text += `${role}`;
            
            if (includeTimestamps) {
                const time = new Date(msg.timestamp).toLocaleString('he-IL');
                text += ` (${time})`;
            }
            
            text += `:\n${msg.content}\n\n`;
        }
        
        // Create a Blob and download
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `chat_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        link.click();
        
        this.showToast('הצ\'אט יוצא בהצלחה לטקסט', 'success');
    }

    initializeQuickActions() {
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
    }

    async handleQuickAction(action) {
        const currentText = this.messageInput.value;
        
        if (action === 'translate') {
            // Translation without API: open translate.google.com with the text
            const isHebrew = /[\u0590-\u05FF]/.test(currentText);
            const targetLang = isHebrew ? 'en' : 'he';
            window.open(`https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(currentText)}`, '_blank');
            this.showToast('נפתח תרגום בגוגל', 'success');
        } else {
            const prompts = {
                summarize: 'סכם את הנושא הזה בצורה קצרה ומובנת: ',
                explain: 'הסבר לי בפשטות מה זה: '
            };
            
            this.messageInput.value = prompts[action] + currentText;
            this.updateCharCount();
            this.messageInput.focus();
        }
    }

    handleContextMenu(e) {
        const messageElement = e.target.closest('.message');
        if (messageElement) {
            e.preventDefault();
            this.showContextMenu(e.pageX, e.pageY, messageElement);
        }
    }

    showContextMenu(x, y, messageElement) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        document.querySelectorAll('.context-item').forEach(item => {
            item.onclick = () => {
                const action = item.getAttribute('data-action');
                this.handleContextAction(action, messageElement);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
    }

    handleContextAction(action, messageElement) {
        const messageId = messageElement.getAttribute('data-message-id');
        
        switch (action) {
            case 'copy':
                const content = messageElement.querySelector('.message-content').innerText;
                navigator.clipboard.writeText(content);
                this.showToast('הועתק ללוח', 'success');
                break;
            case 'edit':
                this.editMessage(messageId);
                break;
            case 'delete':
                this.deleteMessage(messageId);
                break;
            case 'share':
                const msg = messageElement.querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('ההודעה הועתקה לשיתוף', 'success');
                break;
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.loadingOverlay.classList.toggle('active', loading);
        this.sendBtn.disabled = loading || !this.messageInput.value.trim();

        // Stop button in loading overlay
        let stopBtnInOverlay = document.getElementById('stopBtnInOverlay');
        if (!stopBtnInOverlay) {
            stopBtnInOverlay = document.createElement('button');
            stopBtnInOverlay.id = 'stopBtnInOverlay';
            stopBtnInOverlay.className = 'stop-btn stop-btn-overlay';
            stopBtnInOverlay.innerHTML = `<span class="material-icons">stop_circle</span> עצור`;
            stopBtnInOverlay.onclick = () => this.abortGeneration();
            this.loadingOverlay.querySelector('.loading-content').appendChild(stopBtnInOverlay);
        }
        stopBtnInOverlay.style.display = loading ? 'inline-flex' : 'none';

        // Hide bottom stop button
        this.stopBtn.style.display = 'none';

        if (!loading && this.loadingInterval) {
            clearInterval(this.loadingInterval);
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('active');
            });
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${message}</span>
        `;
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideUp 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    toggleVoiceRecording() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'he-IL';
            
            recognition.onstart = () => {
                this.micBtn.style.color = 'var(--accent-color)';
                this.showToast('מתחיל להקליט...', 'success');
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value += transcript;
                this.updateCharCount();
            };
            
            recognition.onend = () => {
                this.micBtn.style.color = '';
                this.showToast('ההקלטה הסתיימה', 'success');
            };
            
            recognition.onerror = () => {
                this.micBtn.style.color = '';
                this.showToast('שגיאה בהקלטה', 'error');
            };
            
            recognition.start();
        } else {
            this.showToast('הדפדפן לא תומך בהקלטה קולית', 'error');
        }
    }

    handleAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.files.push(...files);
            this.renderFilePreview();
        };
        
        input.click();
    }

    handleDropFiles(fileList) {
        const files = Array.from(fileList);
        this.files.push(...files);
        this.renderFilePreview();
    }

    renderFilePreview() {
        this.filePreviewList.innerHTML = '';
        
        this.files.forEach((file, idx) => {
            const icon = this.getFileIcon(file);
            const el = document.createElement('div');
            el.className = 'file-preview';
            el.innerHTML = `
                <span class="material-icons">${icon}</span>
                <span title="${file.name}">${file.name.length > 18 ? file.name.slice(0,15)+'...' : file.name}</span>
                <span>(${this.formatFileSize(file.size)})</span>
                <button class="file-remove-btn" title="הסר" data-idx="${idx}">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            el.querySelector('.file-remove-btn').onclick = (e) => {
                this.files.splice(idx, 1);
                this.renderFilePreview();
            };
            
            this.filePreviewList.appendChild(el);
        });
    }

    getFileIcon(file) {
        if (file.type && file.type.startsWith('image/')) return 'image';
        if (file.type && file.type.startsWith('video/')) return 'movie';
        if (file.type && file.type.startsWith('audio/')) return 'audiotrack';
        if (file.type === 'application/pdf') return 'picture_as_pdf';
        if (file.type && file.type.includes('word')) return 'description';
        if (file.type && file.type.includes('excel')) return 'grid_on';
        if (file.type && file.type.includes('zip')) return 'folder_zip';
        if (file.type && file.type.startsWith('text/')) return 'article';
        return 'attach_file';
    }

    formatFileSize(size) {
        if (size < 1024) return size + 'B';
        if (size < 1024 * 1024) return (size/1024).toFixed(1) + 'KB';
        return (size/1024/1024).toFixed(1) + 'MB';
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveChatData() {
        localStorage.setItem('gemini-chats', JSON.stringify(this.chats));
    }

    regenerateLastResponse() {
        if (!this.currentChatId || this.isLoading) {
            this.showToast('לא ניתן לייצר מחדש כרגע', 'error');
            return;
        }
        
        const messages = this.chats[this.currentChatId].messages;
        if (messages.length < 2) {
            this.showToast('אין תשובה לייצר מחדש', 'error');
            return;
        }
        
        // Find the last user message
        let userMessageIndex = messages.length - 1;
        while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
            userMessageIndex--;
        }
        
        if (userMessageIndex < 0) {
            this.showToast('לא נמצאה הודעת משתמש אחרונה', 'error');
            return;
        }
        
        // Remove all messages after the last user message
        this.chats[this.currentChatId].messages = messages.slice(0, userMessageIndex + 1);
        this.saveChatData();
        this.renderMessages();
        
        // Re-send the last user message
        const lastUserMessage = messages[userMessageIndex].content;
        this.setLoading(true);
        this.startFakeProgressBar();
        this.showLoadingSteps();
        this.abortController = new AbortController();
        
        this.callGemini(lastUserMessage, this.abortController.signal)
            .then(response => {
                const assistantMessage = {
                    id: this.generateMessageId(),
                    role: 'assistant',
                    content: response,
                    timestamp: new Date().toISOString(),
                    model: this.currentModel
                };
                
                this.chats[this.currentChatId].messages.push(assistantMessage);
                this.chats[this.currentChatId].updatedAt = new Date().toISOString();
                this.saveChatData();
                this.renderMessages();
                
                setTimeout(() => {
                    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
                }, 100);
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    this.showToast('התגובה הופסקה', 'error');
                } else {
                    this.showToast('שגיאה בייצור מחדש: ' + error.message, 'error');
                }
            })
            .finally(() => {
                this.setLoading(false);
                this.stopFakeProgressBar();
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeminiClone();
});