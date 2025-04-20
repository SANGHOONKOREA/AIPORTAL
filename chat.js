/**
 * chat.js - GPT 채팅 기능을 위한 스크립트
 * 
 * 주요 기능:
 * 1. 새 채팅 시작, 메시지 전송, 응답 처리
 * 2. 채팅 히스토리 관리 및 표시
 * 3. 파일 업로드 및 첨부 파일 관리
 * 4. 스크린샷 붙여넣기 처리
 */

// 전역 변수 정의
let activeChatId = null; // 현재 활성화된 채팅 ID
let chatMessages = []; // 현재 채팅의 메시지 목록
let uploadedFiles = []; // 업로드된 파일 목록
let isGeneratingResponse = false; // 응답 생성 중인지 여부
let activeFiles = []; // 활성 채팅에 포함된 파일 목록

// 채팅 시작
function startNewChat() {
  // 이미 채팅이 진행 중이면 저장 확인
  if (activeChatId && chatMessages.length > 0) {
    saveChatHistory(activeChatId, chatMessages);
  }
  
  // 새 채팅 ID 생성
  activeChatId = Date.now().toString();
  chatMessages = [];
  activeFiles = [];
  
  // 파일 초기화
  uploadedFiles = [];
  updateFilePreviewArea();
  
  // 채팅 입력창 초기화
  DOM.chatInputBox.innerHTML = '';
  
  // 채팅 인터페이스 초기화
  DOM.chatMessages.innerHTML = '';
  DOM.chatTitle.textContent = "새 채팅";
  
  // 채팅 화면 표시
  DOM.appContainer.style.display = "none";
  DOM.chatHistoryContainer.style.display = "none";
  DOM.gptChatContainer.style.display = "flex";
  
  // AI 모델 설정을 화면에 표시
  const welcomeMsg = createSystemMessage(
    `안녕하세요! 무엇을 도와드릴까요?<br>
    <small class="text-gray-500">(현재 사용 중인 모델: ${aiConfig.model})</small>`
  );
  DOM.chatMessages.appendChild(welcomeMsg);
  
  // 채팅 입력창 포커스
  setTimeout(() => DOM.chatInputBox.focus(), 100);
  
  // 채팅 활동 로깅
  logUserActivity("start_new_chat");
}

// 채팅 인터페이스 닫기
function closeChat() {
  // 현재 채팅 저장
  if (activeChatId && chatMessages.length > 0) {
    saveChatHistory(activeChatId, chatMessages);
  }
  
  // 파일 초기화
  uploadedFiles = [];
  updateFilePreviewArea();
  
  // 채팅 입력창 초기화
  DOM.chatInputBox.innerHTML = '';
  
  // 인터페이스 전환
  DOM.gptChatContainer.style.display = "none";
  DOM.appContainer.style.display = "flex";
}

// 메시지 전송
function sendMessage() {
  // 채팅 입력창 내용 가져오기
  const content = DOM.chatInputBox.innerHTML.trim();
  
  // 입력 내용이 없고 파일도 없으면 무시
  if (!content && uploadedFiles.length === 0) return;
  
  // 응답 생성 중이면 무시
  if (isGeneratingResponse) {
    showToast("이전 응답을 생성 중입니다. 잠시 기다려주세요.", true);
    return;
  }
  
  // 메시지 객체 생성
  const message = {
    role: 'user',
    content: content,
    files: [...uploadedFiles],
    timestamp: new Date().toISOString()
  };
  
  // 메시지 목록에 추가
  chatMessages.push(message);
  
  // 파일 목록에 추가
  activeFiles = [...activeFiles, ...uploadedFiles.map(file => ({
    ...file,
    messageIndex: chatMessages.length > 0 ? chatMessages.length - 1 : 0
  }))];
  
  // 메시지 UI에 추가
  appendMessageToUI(message);
  
  // 입력창 및 파일 목록 초기화
  DOM.chatInputBox.innerHTML = '';
  uploadedFiles = [];
  updateFilePreviewArea();
  
  // AI 응답 생성
  generateAIResponse();
}

// AI 응답 생성
async function generateAIResponse() {
  try {
    isGeneratingResponse = true;
    
    // 로딩 인디케이터 표시
    const loadingEl = document.createElement('div');
    loadingEl.className = 'chat-message assistant';
    loadingEl.innerHTML = `
      <div class="chat-message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="chat-message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    DOM.chatMessages.appendChild(loadingEl);
    
    // 스크롤 맨 아래로
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    
    // 먼저 파일 참조 준비
    const preparedFiles = await prepareFilesForAPI(activeFiles);
    activeFiles = preparedFiles; // 업데이트된 파일 정보 저장
    
    // OpenAI API에 전송할 메시지 준비
    const apiMessages = prepareMessagesForAPI(chatMessages);
    
    // API 요청
    const response = await fetchAIResponse(apiMessages);
    
    // 로딩 인디케이터 제거
    DOM.chatMessages.removeChild(loadingEl);
    
    // 응답 처리
    if (response && response.choices && response.choices.length > 0) {
      // API 응답에서 텍스트 내용 추출
      let responseContent = "";
      const responseMessage = response.choices[0].message;
      
      // OpenAI 응답 형식에 따라 처리
      if (Array.isArray(responseMessage.content)) {
        // 여러 형식의 콘텐츠가 있는 경우 (멀티모달 응답)
        responseContent = responseMessage.content
          .filter(item => item.type === "text")
          .map(item => item.text)
          .join("\n");
      } else {
        // 단순 텍스트 응답인 경우
        responseContent = responseMessage.content;
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString()
      };
      
      // 메시지 목록에 추가
      chatMessages.push(assistantMessage);
      
      // 메시지 UI에 추가
      appendMessageToUI(assistantMessage);
      
      // 채팅 저장
      saveChatHistory(activeChatId, chatMessages);
      
      // 제목 업데이트 (첫 번째 메시지인 경우)
      if (chatMessages.length === 2 && DOM.chatTitle.textContent === "새 채팅") {
        updateChatTitle();
      }
    } else {
      throw new Error("API 응답이 올바르지 않습니다.");
    }
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);
    
    // 에러 메시지 표시
    const errorMessage = {
      role: 'assistant',
      content: "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
      timestamp: new Date().toISOString(),
      error: true
    };
    
    chatMessages.push(errorMessage);
    appendMessageToUI(errorMessage);
    showToast("응답 생성 중 오류가 발생했습니다.", true);
  } finally {
    isGeneratingResponse = false;
  }
}

// API용 메시지 준비
function prepareMessagesForAPI(messages) {
  // OpenAI API 형식에 맞게 메시지 변환
  return messages.map(msg => {
    // 기본 메시지 객체
    const apiMessage = {
      role: msg.role,
      content: []
    };
    
    // 텍스트 내용이 있으면 추가
    if (msg.content && msg.content.trim()) {
      apiMessage.content.push({
        type: "text",
        text: msg.content
      });
    }
    
    // 파일이 있는 경우 이미지로 추가
    if (msg.files && msg.files.length > 0) {
      msg.files.forEach(file => {
        if (file.type.startsWith('image/')) {
          // 이미지 파일인 경우 이미지 객체 추가
          apiMessage.content.push({
            type: "image_url",
            image_url: {
              url: file.dataUrl, // base64 이미지 데이터
              detail: "auto"     // 이미지 분석 상세도 설정
            }
          });
        } else {
          // 이미지가 아닌 파일은 참조만 추가
          apiMessage.content.push({
            type: "text",
            text: `[첨부 파일: ${file.name}]`
          });
        }
      });
    }
    
    // content가 비어있으면 기본 텍스트 추가
    if (apiMessage.content.length === 0) {
      apiMessage.content.push({
        type: "text",
        text: ""
      });
    }
    
    return apiMessage;
  });
}

// API용 파일 준비
async function prepareFilesForAPI(files) {
  // 파일들의 데이터 URL을 생성하여 반환
  const filePromises = files.map(async file => {
    if (file.type.startsWith('image/')) {
      // 이미지 파일은 base64로 변환
      if (!file.dataUrl) {
        file.dataUrl = await fileToDataURL(file);
      }
    }
    return file;
  });
  
  return Promise.all(filePromises);
}

// 파일을 dataURL로 변환
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// API 응답 가져오기
async function fetchAIResponse(messages) {
  // 개발 환경에서는 하드코딩된 응답 반환 (실제 API 호출 대신)
  if (isDevelopmentMode()) {
    return simulateAPIResponse(messages);  // await만 사용하거나 괄호를 정확히 맞춰야 합니다
  }
  
  try {
    console.log("API에 전송할 메시지:", messages);
    
    // OpenAI API 호출
async function fetchAIResponse(messages) {
  // FormData 준비
  const form = new FormData();
  // messages는 JSON 배열이므로 Blob으로 감싸서 전송
  form.append('messages', new Blob([JSON.stringify(messages)], { type: 'application/json' }));
  // 모델 파라미터
  form.append('model', aiConfig.model);
  form.append('max_tokens', aiConfig.maxTokens);
  form.append('temperature', aiConfig.temperature);

  // 파일 첨부 (이미지든 PDF든, rawFile 프로퍼티에 원본 File 객체를 담아 두세요)
  activeFiles.forEach(file => {
    if (file.rawFile) {
      form.append('files', file.rawFile, file.name);
    }
  });

  // Assistants API 호출 (chat completions 대신)
  const assistantId = 'YOUR_ASSISTANT_ID'; // 미리 생성한 assistant id
  const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      // 'Content-Type' 제거: 브라우저가 multipart boundary를 자동 설정
    },
    body: form
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API 오류: ${err.error?.message || response.statusText}`);
  }
  return await response.json();
}

    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API 호출 실패:", error);
    throw error;
  }
}

// 개발 환경 확인
function isDevelopmentMode() {
  return false; // 실제 환경에서는 API 호출
}

// API 응답 시뮬레이션 (개발 환경용)
async function simulateAPIResponse(messages) {
  // 실제 개발에서는 필요하지 않음
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        choices: [{
          message: {
            role: 'assistant',
            content: '개발 환경에서 생성된 테스트 응답입니다.'
          }
        }]
      });
    }, 1000);
  });
}

// 메시지를 UI에 추가
function appendMessageToUI(message) {
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${message.role}`;
  
  // 아바타 아이콘 설정
  const avatarIcon = message.role === 'user' ? 'fa-user' : 'fa-robot';
  
  // 메시지 내용 처리 (마크다운 처리)
  let processedContent = message.content;
  
  // 마크다운 처리 (assistant 메시지만)
  if (message.role === 'assistant' && !message.error) {
    // 코드 블록 처리
    processedContent = marked.parse(processedContent);
  } else {
    // 일반 텍스트 처리 (줄바꿈 유지)
    processedContent = processedContent.replace(/\n/g, '<br>');
  }
  
  // 첨부 파일이 있는 경우 표시
  let filesHTML = '';
  if (message.files && message.files.length > 0) {
    const fileLinks = message.files.map(file => {
      // 이미지 파일인 경우 미리보기 표시
      if (file.type.startsWith('image/')) {
        return `
          <div class="file-preview-item">
            <img src="${file.url}" alt="${file.name}" class="file-preview-image">
            <div class="file-preview-name">${file.name}</div>
          </div>
        `;
      }
      // 그 외 파일은 링크로 표시
      return `
        <div class="file-preview-item">
          <span class="file-preview-icon"><i class="fas fa-file"></i></span>
          <span class="file-preview-name">${file.name}</span>
        </div>
      `;
    }).join('');
    
    filesHTML = `
      <div class="chat-message-files">
        ${fileLinks}
      </div>
    `;
  }
  
  // 시간 포맷팅
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // HTML 구성
  messageEl.innerHTML = `
    <div class="chat-message-avatar">
      <i class="fas ${avatarIcon}"></i>
    </div>
    <div class="chat-message-content ${message.role === 'assistant' ? 'markdown-content' : ''}">
      ${processedContent}
      ${filesHTML}
      <div class="chat-message-time">${time}</div>
    </div>
  `;
  
  // 메시지 추가
  DOM.chatMessages.appendChild(messageEl);
  
  // 코드 하이라이트 적용 (assistant 메시지만)
  if (message.role === 'assistant' && !message.error) {
    messageEl.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
  
  // 스크롤 맨 아래로
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// 시스템 메시지 생성 (환영 메시지 등)
function createSystemMessage(content) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'chat-message system';
  systemMsg.innerHTML = `
    <div class="chat-message-content text-center p-4">
      ${content}
    </div>
  `;
  return systemMsg;
}

// 채팅 제목 업데이트
function updateChatTitle() {
  // 첫 번째 사용자 메시지를 기반으로 제목 생성
  if (chatMessages.length >= 1 && chatMessages[0].role === 'user') {
    const firstMessage = chatMessages[0].content;
    // 너무 긴 제목은 자르기
    const maxTitleLength = 30;
    const title = firstMessage.length > maxTitleLength
      ? firstMessage.substring(0, maxTitleLength) + '...'
      : firstMessage;
    
    DOM.chatTitle.textContent = title;
    
    // 채팅 기록 업데이트
    saveChatTitle(activeChatId, title);
  }
}

// 채팅 히스토리 저장
function saveChatHistory(chatId, messages) {
  if (!currentUid) return;
  
  // 저장할 데이터 준비
  const chatData = {
    id: chatId,
    title: DOM.chatTitle.textContent || "새 채팅",
    messages: messages,
    updatedAt: new Date().toISOString(),
    userId: currentUid
  };
  
  // Firebase에 저장
  db.ref(`chatHistory/${currentUid}/${chatId}`)
    .set(chatData)
    .catch(err => {
      console.error("채팅 저장 실패:", err);
    });
}

// 채팅 제목 저장
function saveChatTitle(chatId, title) {
  if (!currentUid) return;
  
  db.ref(`chatHistory/${currentUid}/${chatId}/title`)
    .set(title)
    .catch(err => {
      console.error("채팅 제목 저장 실패:", err);
    });
}

// 채팅 히스토리 보기
function showChatHistory() {
  if (!currentUid) return;
  
  // 인터페이스 전환
  DOM.appContainer.style.display = "none";
  DOM.gptChatContainer.style.display = "none";
  DOM.chatHistoryContainer.style.display = "flex";
  
  // 히스토리 목록 영역 초기화
  DOM.historyList.innerHTML = `
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full inline-block animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-300">채팅 히스토리 로딩 중...</p>
      </div>
    </div>
  `;
  
  // Firebase에서 채팅 히스토리 로드
  db.ref(`chatHistory/${currentUid}`)
    .orderByChild("updatedAt")
    .once("value")
    .then(snapshot => {
      // 히스토리 영역 초기화
      DOM.historyList.innerHTML = "";
      
      // 데이터가 없는 경우
      if (!snapshot.exists()) {
        DOM.historyList.innerHTML = `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <div class="mb-4">
              <i class="fas fa-history text-4xl text-gray-400 dark:text-gray-500"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">채팅 히스토리 없음</h3>
            <p class="text-gray-500 dark:text-gray-400">아직 채팅 히스토리가 없습니다. 새 채팅을 시작해보세요.</p>
            <button onclick="startNewChat()" class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
              <i class="fas fa-plus-circle mr-2"></i> 새 채팅
            </button>
          </div>
        `;
        return;
      }
      
      // 채팅 항목 정렬 (최신순)
      const chats = [];
      snapshot.forEach(childSnapshot => {
        chats.push(childSnapshot.val());
      });
      
      // 최신순 정렬
      chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // 히스토리 목록 생성
      const historyItems = chats.map(chat => {
        // 채팅 제목 (없으면 첫 메시지 내용으로)
        const title = chat.title || "새 채팅";
        
        // 미리보기 내용 (첫 메시지 내용)
        let preview = "";
        if (chat.messages && chat.messages.length > 0) {
          const firstUserMessage = chat.messages.find(msg => msg.role === 'user');
          if (firstUserMessage) {
            preview = firstUserMessage.content.substring(0, 100) + (firstUserMessage.content.length > 100 ? "..." : "");
          }
        }
        
        // 날짜 포맷팅
        const date = new Date(chat.updatedAt);
        const formattedDate = date.toLocaleDateString([], { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        // 히스토리 아이템 템플릿
        return `
          <div class="chat-history-item" onclick="loadChat('${chat.id}')">
            <h3 class="chat-history-title">${title}</h3>
            <p class="chat-history-preview">${preview}</p>
            <p class="chat-history-time">${formattedDate}</p>
          </div>
        `;
      }).join("");
      
      // 히스토리 목록 추가
      DOM.historyList.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${historyItems}
        </div>
      `;
    })
    .catch(err => {
      console.error("채팅 히스토리 로드 실패:", err);
      DOM.historyList.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <div class="mb-4">
            <i class="fas fa-exclamation-circle text-4xl text-red-500"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">데이터 로드 실패</h3>
          <p class="text-gray-500 dark:text-gray-400">채팅 히스토리를 불러오는 데 실패했습니다. 다시 시도해 주세요.</p>
        </div>
      `;
    });
}

// 채팅 히스토리에서 채팅 불러오기
function loadChat(chatId) {
  if (!currentUid) return;
  
  // Firebase에서 채팅 데이터 로드
  db.ref(`chatHistory/${currentUid}/${chatId}`)
    .once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        showToast("채팅을 찾을 수 없습니다.", true);
        return;
      }
      
      const chatData = snapshot.val();
      
      // 현재 채팅 데이터 설정
      activeChatId = chatId;
      chatMessages = chatData.messages || [];
      activeFiles = []; // 파일 정보 초기화
      
      // 파일 정보 수집
      chatMessages.forEach((msg, index) => {
        if (msg.files && msg.files.length > 0) {
          activeFiles = [...activeFiles, ...msg.files.map(file => ({
            ...file,
            messageIndex: index
          }))];
        }
      });
      
      // 채팅 UI 초기화
      DOM.chatMessages.innerHTML = '';
      DOM.chatTitle.textContent = chatData.title || "채팅";
      
      // 모든 메시지를 UI에 추가
      chatMessages.forEach(msg => {
        appendMessageToUI(msg);
      });
      
      // 파일 초기화
      uploadedFiles = [];
      updateFilePreviewArea();
      
      // 채팅 입력창 초기화
      DOM.chatInputBox.innerHTML = '';
      
      // 인터페이스 전환
      DOM.chatHistoryContainer.style.display = "none";
      DOM.gptChatContainer.style.display = "flex";
      
      // 스크롤 맨 아래로
      DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
      
      // 포커스 설정
      setTimeout(() => DOM.chatInputBox.focus(), 100);
    })
    .catch(err => {
      console.error("채팅 로드 실패:", err);
      showToast("채팅을 불러오는 데 실패했습니다.", true);
    });
}

// 파일 업로드 처리
function handleFileUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  // 각 파일 처리
  Array.from(files).forEach(file => {
    processFile(file);
  });
  
  // 파일 입력 초기화 (같은 파일 다시 선택할 수 있도록)
  event.target.value = '';
}

// 파일 처리
async function processFile(file) {
  try {
    // 파일 크기 검사 (20MB 제한)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      showToast(`"${file.name}" 파일이 너무 큽니다. 20MB 이하의 파일만 업로드 가능합니다.`, true);
      return;
    }
    
    // 파일 유형 확인
    const fileType = getFileType(file);
    
    // 이미지 파일인 경우 dataURL 생성
    let dataUrl = null;
    if (file.type.startsWith('image/')) {
      dataUrl = await fileToDataURL(file);
    }
    
    // 파일 URL 생성 (Firebase Storage에 업로드 또는 로컬 URL)
    const fileUrl = await uploadFileToStorage(file);
    
    // 업로드된 파일 목록에 추가
    uploadedFiles.push({
      name: file.name,
      type: file.type,
      size: file.size,
      url: fileUrl,
      dataUrl: dataUrl, // 이미지 파일의 경우 dataURL 저장
      fileType: fileType
    });
    
    // 파일 미리보기 업데이트
    updateFilePreviewArea();
  } catch (error) {
    console.error("파일 처리 실패:", error);
    showToast(`"${file.name}" 파일 처리 중 오류가 발생했습니다.`, true);
  }
}

// 파일 타입 결정
function getFileType(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'excel';
  if (file.type.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return 'word';
  return 'file';
}

// Firebase Storage에 파일 업로드
async function uploadFileToStorage(file) {
  // 사용자가 로그인되어 있지 않으면 로컬 URL 반환
  if (!currentUid) {
    return URL.createObjectURL(file);
  }
  
  try {
    // 파일 경로 설정
    const filePath = `users/${currentUid}/chat_files/${activeChatId}/${Date.now()}_${file.name}`;
    const storageRef = storage.ref(filePath);
    
    // 파일 업로드
    const snapshot = await storageRef.put(file);
    
    // 다운로드 URL 반환
    return await snapshot.ref.getDownloadURL();
  } catch (error) {
    console.error("파일 업로드 실패:", error);
    // 실패 시 로컬 URL 사용
    return URL.createObjectURL(file);
  }
}

// 파일 미리보기 영역 업데이트
function updateFilePreviewArea() {
  const filePreviewArea = DOM.filePreviewArea;
  
  // 파일이 없으면 영역 숨김
  if (uploadedFiles.length === 0) {
    filePreviewArea.style.display = 'none';
    return;
  }
  
  // 파일 미리보기 표시
  filePreviewArea.style.display = 'flex';
  filePreviewArea.innerHTML = '';
  
  // 각 파일 미리보기 생성
  uploadedFiles.forEach((file, index) => {
    const filePreview = document.createElement('div');
    filePreview.className = 'file-preview-item';
    
    // 파일 타입에 따른 아이콘
    let fileIcon = 'fa-file';
    if (file.fileType === 'image') fileIcon = 'fa-file-image';
    else if (file.fileType === 'video') fileIcon = 'fa-file-video';
    else if (file.fileType === 'audio') fileIcon = 'fa-file-audio';
    else if (file.fileType === 'pdf') fileIcon = 'fa-file-pdf';
    else if (file.fileType === 'excel') fileIcon = 'fa-file-excel';
    else if (file.fileType === 'word') fileIcon = 'fa-file-word';
    
    // 이미지인 경우 미리보기 표시
    if (file.fileType === 'image') {
      filePreview.innerHTML = `
        <img src="${file.url || file.dataUrl}" alt="${file.name}" class="file-preview-image">
        <div class="file-preview-name">${file.name}</div>
        <button class="file-preview-remove" onclick="removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
    } else {
      filePreview.innerHTML = `
        <div class="file-preview-icon">
          <i class="fas ${fileIcon}"></i>
        </div>
        <div class="file-preview-name">${file.name}</div>
        <button class="file-preview-remove" onclick="removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
    }
    
    filePreviewArea.appendChild(filePreview);
  });
}

// 파일 제거
function removeFile(index) {
  // 해당 인덱스의 파일 제거
  uploadedFiles.splice(index, 1);
  
  // 미리보기 업데이트
  updateFilePreviewArea();
}

// 붙여넣기 이벤트 처리 (스크린샷)
function handlePaste(e) {
  console.log("붙여넣기 이벤트 감지");
  
  try {
    // 클립보드 데이터 확인
    const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
    
    if (!clipboardData || !clipboardData.items) {
      console.log("클립보드 데이터 없음");
      return;
    }
    
    const items = clipboardData.items;
    console.log("클립보드 항목 수:", items.length);
    
    let imageFound = false;
    
    // 클립보드 항목 순회
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log("클립보드 항목 타입:", item.type);
      
      // 이미지 타입인 경우
      if (item.type.indexOf('image') !== -1) {
        // 이미지 파일 가져오기
        const file = item.getAsFile();
        if (file) {
          console.log("이미지 파일 감지:", file.name);
          imageFound = true;
          
          // 파일 이름 생성 (현재 시간 기준)
          const now = new Date();
          const fileName = `스크린샷_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.png`;
          
          // 파일 객체 생성 (이름 지정)
          const renamedFile = new File([file], fileName, { type: file.type });
          
          // 파일 처리
          processFile(renamedFile);
        }
      }
    }
    
    // 이미지가 있었다면 기본 붙여넣기 동작 방지
    if (imageFound) {
      e.preventDefault();
      console.log("이미지 붙여넣기 처리 완료");
    }
  } catch (error) {
    console.error("붙여넣기 처리 중 오류 발생:", error);
  }
}

// 파일 드래그 앤 드롭 설정
function setupDragAndDrop() {
  console.log("드래그 앤 드롭 설정 시작");
  const dropArea = document.getElementById("chat-input-box");
  
  if (!dropArea) {
    console.error("채팅 입력 영역을 찾을 수 없습니다.");
    return;
  }
  
  console.log("드래그 앤 드롭 영역:", dropArea);
  
  // 드래그 이벤트 핸들러
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function(e) {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });
  
  // 드래그 상태 표시
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, function() {
      dropArea.classList.add('border-blue-500');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function() {
      dropArea.classList.remove('border-blue-500');
    }, false);
  });
  
  // 파일 드롭 처리
  dropArea.addEventListener('drop', function(e) {
    console.log("파일 드롭됨");
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      console.log("드롭된 파일 수:", files.length);
      Array.from(files).forEach(function(file) {
        processFile(file);
      });
    }
  }, false);
  
  console.log("드래그 앤 드롭 설정 완료");
}

// 이벤트 리스너 등록
function initChatEventListeners() {
  console.log("채팅 이벤트 리스너 초기화");
  
  // DOM 요소 참조 재확인
  const newChatBtn = document.getElementById("new-chat-btn");
  const chatHistoryBtn = document.getElementById("chat-history-btn");
  const backToHomeBtn = document.getElementById("back-to-home");
  const backFromHistoryBtn = document.getElementById("back-from-history");
  const sendMessageBtn = document.getElementById("send-message-btn");
  const fileUploadBtn = document.getElementById("file-upload-btn");
  const fileUploadInput = document.getElementById("file-upload-input");
  const chatInputBox = document.getElementById("chat-input-box");
  
  // 새 채팅 버튼 이벤트 리스너
  if (newChatBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newChatBtnClone = newChatBtn.cloneNode(true);
    newChatBtn.parentNode.replaceChild(newChatBtnClone, newChatBtn);
    
    // 새 이벤트 리스너 등록
    newChatBtnClone.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("새 채팅 버튼 클릭됨");
      startNewChat();
    });
    console.log("새 채팅 버튼 이벤트 리스너 등록 완료");
  } else {
    console.error("새 채팅 버튼 요소를 찾을 수 없습니다");
  }
  
  // 채팅 히스토리 버튼 이벤트 리스너
  if (chatHistoryBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    const chatHistoryBtnClone = chatHistoryBtn.cloneNode(true);
    chatHistoryBtn.parentNode.replaceChild(chatHistoryBtnClone, chatHistoryBtn);
    
    // 새 이벤트 리스너 등록
    chatHistoryBtnClone.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("채팅 히스토리 버튼 클릭됨");
      showChatHistory();
    });
    console.log("채팅 히스토리 버튼 이벤트 리스너 등록 완료");
  } else {
    console.error("채팅 히스토리 버튼 요소를 찾을 수 없습니다");
  }
  
  // 뒤로 가기 버튼 이벤트 리스너
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", function(e) {
      e.preventDefault();
      closeChat();
    });
  }
  
  // 히스토리에서 뒤로 가기 버튼 이벤트 리스너
  if (backFromHistoryBtn) {
    backFromHistoryBtn.addEventListener("click", function(e) {
      e.preventDefault();
      const chatHistoryContainer = document.getElementById("chat-history-container");
      const appContainer = document.getElementById("app-container");
      if (chatHistoryContainer) chatHistoryContainer.style.display = "none";
      if (appContainer) appContainer.style.display = "flex";
    });
  }
  
  // 메시지 전송 버튼 이벤트 리스너
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("메시지 전송 버튼 클릭됨");
      sendMessage();
    });
  }
  
  // 파일 업로드 버튼 이벤트 리스너
  if (fileUploadBtn) {
    fileUploadBtn.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("파일 업로드 버튼 클릭됨");
      if (fileUploadInput) fileUploadInput.click();
    });
  }
  
  // 파일 선택 이벤트 리스너
  if (fileUploadInput) {
    fileUploadInput.addEventListener("change", function(e) {
      console.log("파일 선택됨");
      handleFileUpload(e);
    });
  }
  
  // 채팅 입력창 엔터 키 이벤트 리스너
  if (chatInputBox) {
    chatInputBox.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        console.log("엔터 키 눌림");
        sendMessage();
      }
    });
    
    // 파일 붙여넣기 이벤트 리스너 (스크린샷 지원)
    chatInputBox.addEventListener("paste", function(e) {
      console.log("붙여넣기 감지됨");
      handlePaste(e);
    });
    
    console.log("채팅 입력창 이벤트 리스너 등록 완료");
    
    // 드래그 앤 드롭 설정
    setupDragAndDrop();
  } else {
    console.error("채팅 입력창 요소를 찾을 수 없습니다");
  }
}

// DOM이 로드된 후에 이벤트 리스너 초기화
document.addEventListener('DOMContentLoaded', function() {
  initChatEventListeners();
});

// 페이지가 이미 로드된 경우 즉시 실행
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initChatEventListeners, 1);
}

// 필요한 함수들을 window 객체에 등록하여 전역으로 사용할 수 있게 함
window.startNewChat = startNewChat;
window.showChatHistory = showChatHistory;
window.sendMessage = sendMessage;
window.closeChat = closeChat;
window.handleFileUpload = handleFileUpload;
window.handlePaste = handlePaste;
window.setupDragAndDrop = setupDragAndDrop;
window.processFile = processFile;
window.removeFile = removeFile;
window.loadChat = loadChat;