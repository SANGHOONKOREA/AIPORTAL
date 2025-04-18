    const firebaseConfig = {
      apiKey: "AIzaSyCoOg2HPjk-oEhtVrLv3hH-3VLCwa2MAfE",
      authDomain: "sanghoon-d8f1c.firebaseapp.com",
      databaseURL: "https://sanghoon-d8f1c-default-rtdb.firebaseio.com",
      projectId: "sanghoon-d8f1c",
      storageBucket: "sanghoon-d8f1c.appspot.com",
      messagingSenderId: "495391900753",
      appId: "1:495391900753:web:b0d708eeca64fafe562470",
      measurementId: "G-J2E22BW61H"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const auth = firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);  

/****************************************
     1) 전역 변수 설정
    *****************************************/
    let deleteMode = false;
    let chatbotGroups = [];
    let selectedGroupId = null;
    let currentUser = null;
    let currentUid = null;
    let activeSession = "all";
    let userRole = "사용자";
    let isDarkMode = false;
    let isAdminPanelOpen = false;
    
    // 전역 객체 sessionInfo (세션별 아이콘 및 타이틀 매핑)
    const sessionInfo = {
      all: { icon: "fa-bars", title: "전체" },
      as: { icon: "fa-cogs", title: "AS 업무 자동화" },
      knowledge: { icon: "fa-brain", title: "업무 지식" }
    };
    
    // 기본 고객지원 챗봇 데이터 (예제 데이터 제거 → 빈 객체)
    const chatbotData = {};
    
    // 기본 세션 목록 → "전체"만 남김
    const defaultSessions = [{ id: "all", title: "전체" }];
    
    // 그룹별 세션 데이터 저장
    let groupSessions = {}; // { groupId: [sessions], ... }
    
    // DOM 엘리먼트들의 참조 저장
    const DOM = {
      initialLoader: document.getElementById("initial-loader"),
      loginContainer: document.getElementById("login-container"),
      appContainer: document.getElementById("app-container"),
      loginEmail: document.getElementById("loginEmail"),
      loginPw: document.getElementById("loginPw"),
      loginBtn: document.getElementById("loginBtn"),
      loginAlert: document.getElementById("login-alert"),
      searchInput: document.getElementById("searchInput"),
      clearSearchBtn: document.getElementById("clear-search"),
      contentArea: document.getElementById("content-area"),
      sidebarList: document.getElementById("sidebar-list"),
      tabMenu: document.getElementById("tab-menu"),
      sidebar: document.getElementById("sidebar"),
      toast: document.getElementById("toast"),
      userNameEl: document.getElementById("user-name"),
      userRoleEl: document.getElementById("user-role"),
      togglePasswordBtn: document.getElementById("toggle-password"),
      rememberMeCheckbox: document.getElementById("remember-me"),
      mobileMenuBtn: document.getElementById("mobile-menu-btn"),
      collapseSidebarBtn: document.getElementById("collapse-sidebar-btn"),
      resetPasswordBtn: document.getElementById("resetPasswordBtn"),
      logoutBtn: document.getElementById("logoutBtn"),
      adminBtn: document.getElementById("adminBtn"),
      themeToggle: document.getElementById("theme-toggle"),
      mainContent: document.getElementById("main-content"),
      pageTitle: document.getElementById("page-title"),
      adminPanel: document.getElementById("admin-panel"),
      adminPanelOverlay: document.getElementById("admin-panel-overlay"),
      closeAdminPanelBtn: document.getElementById("close-admin-panel"),
      deleteChatbotAdminBtn: document.getElementById("deleteChatbotAdminBtn"),
      sessionDropdownToggle: document.getElementById("session-dropdown-toggle"),
      sessionDropdownMenu: document.getElementById("session-dropdown-menu"),
      currentSessionName: document.getElementById("current-session-name"),
      excelUploadModal: document.getElementById("excel-upload-modal"),
      closeExcelModalBtn: document.getElementById("close-excel-modal"),
      cancelExcelUploadBtn: document.getElementById("cancel-excel-upload"),
      confirmExcelUploadBtn: document.getElementById("confirm-excel-upload"),
      excelFileInput: document.getElementById("excel-file"),
      excelFilename: document.getElementById("excel-filename")
    };
    
    /****************************************
     2) 초기화 및 이벤트 리스너 설정
    *****************************************/
    document.addEventListener("DOMContentLoaded", function() {
      // 다크 모드 설정 초기화
      initTheme();
      
      // 패스워드 토글 버튼 이벤트 리스너
      DOM.togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
      
      // 검색창 이벤트 리스너 
      DOM.searchInput.addEventListener("input", function() {
        DOM.clearSearchBtn.style.display = this.value ? "flex" : "none";
        searchChatbots();
      });
      
      // 검색 지우기 버튼 이벤트 리스너
      DOM.clearSearchBtn.addEventListener("click", function() {
        DOM.searchInput.value = "";
        DOM.clearSearchBtn.style.display = "none";
        searchChatbots();
      });
      
      // 로그인 폼 엔터 키 이벤트 리스너
      DOM.loginEmail.addEventListener("keyup", function(e) {
        if (e.key === "Enter") DOM.loginPw.focus();
      });
      
      DOM.loginPw.addEventListener("keyup", function(e) {
        if (e.key === "Enter") handleLogin();
      });
      
      // 로그인 버튼 클릭 이벤트 리스너
      DOM.loginBtn.addEventListener("click", handleLogin);
      
      // 비밀번호 재설정 버튼 클릭 이벤트 리스너
      DOM.resetPasswordBtn.addEventListener("click", resetPassword);
      
      // 로그아웃 버튼 클릭 이벤트 리스너
      DOM.logoutBtn.addEventListener("click", logout);
      
      // 모바일 메뉴 버튼 이벤트 리스너
      DOM.mobileMenuBtn.addEventListener("click", function() {
        DOM.sidebar.classList.toggle("open");
      });
      
      // 사이드바 축소 버튼 이벤트 리스너
      DOM.collapseSidebarBtn.addEventListener("click", toggleSidebar);
      
      // 테마 토글 버튼 이벤트 리스너
      DOM.themeToggle.addEventListener("click", toggleTheme);
      
      // 토스트 닫기 버튼 이벤트 리스너
      document.querySelector('.toast-close').addEventListener('click', function() {
        hideToast();
      });
      
      // 관리자 패널 관련 이벤트 리스너
      DOM.adminBtn.addEventListener("click", toggleAdminPanel);
      DOM.closeAdminPanelBtn.addEventListener("click", toggleAdminPanel);
      DOM.adminPanelOverlay.addEventListener("click", toggleAdminPanel);
      

      
      // 세션 드롭다운 외부 클릭 감지 이벤트 리스너
      document.addEventListener("click", function(event) {
        if (!DOM.sessionDropdownToggle.contains(event.target) && !DOM.sessionDropdownMenu.contains(event.target)) {
          DOM.sessionDropdownMenu.classList.remove("show");
        }
      });
      
// 엑셀 파일 선택 이벤트 리스너 수정
DOM.excelFileInput.addEventListener("change", function() {
  if (this.files.length > 0) {
    DOM.excelFilename.textContent = this.files[0].name;
    // 파일 선택 시 바로 파싱 작업 진행
    uploadExcelData();
  } else {
    DOM.excelFilename.textContent = "선택된 파일 없음";
  }
});
      
// 전역 변수(window.excelGroupsData, window.excelSessionsData, window.excelChatbotsData)는 uploadExcelData에서 채워짐

// 새 버튼 이벤트 설정:
DOM.replaceExcelUploadBtn = document.getElementById("replace-excel-upload");
DOM.mergeExcelUploadBtn = document.getElementById("merge-excel-upload");
DOM.cancelExcelUploadBtn = document.getElementById("cancel-excel-upload");

// "전체 교체" 버튼: 기존 데이터를 모두 삭제한 후 새로 업로드 ("replace" 옵션)
DOM.replaceExcelUploadBtn.addEventListener("click", function() {
  processExcelData("replace", window.excelGroupsData, window.excelSessionsData, window.excelChatbotsData);
});

// "부분 추가" 버튼: 기존 데이터에 새 데이터를 병합 ("merge" 옵션)
DOM.mergeExcelUploadBtn.addEventListener("click", function() {
  processExcelData("merge", window.excelGroupsData, window.excelSessionsData, window.excelChatbotsData);
});

// "취소" 버튼: 업로드 취소
DOM.cancelExcelUploadBtn.addEventListener("click", function() {
  closeExcelUploadModal();
  showToast("업로드가 취소되었습니다.", true);
});

document.getElementById("userExcelDownloadBtn").addEventListener("click", downloadUserExcel);
document.getElementById("userExcelUploadBtn").addEventListener("click", function(){
  showUserExcelUploadModal();
});

     
      // 모바일 디바이스 감지 및 처리
      checkMobileDevice();
      
      // 윈도우 리사이즈 이벤트 리스너
      window.addEventListener("resize", checkMobileDevice);
      
      // 초기 로딩이 완료되면 로그인 화면 표시
      setTimeout(() => {
        DOM.initialLoader.style.display = "none";
        DOM.loginContainer.style.display = "flex";
      }, 1000);
    });
    
    /****************************************
     3) 유틸리티 함수
    *****************************************/
    // 모바일 디바이스 체크
    function checkMobileDevice() {
      const isMobile = window.innerWidth <= 1024;
      DOM.mobileMenuBtn.style.display = isMobile ? "block" : "none";
      
      if (isMobile) {
        DOM.sidebar.classList.remove("open");
        DOM.mainContent.classList.remove("main-content-expanded");
      } else {
        DOM.sidebar.classList.add("open");
        if (DOM.sidebar.classList.contains("sidebar-collapsed")) {
          DOM.mainContent.classList.add("main-content-expanded");
        }
      }
    }
    
    // 테마 초기화
    function initTheme() {
      // 로컬 스토리지에서 테마 설정 가져오기
      const storedTheme = localStorage.getItem("theme") || "light";
      
      // 시스템 테마 확인
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      
      // 테마 설정 적용
      if (storedTheme === "dark" || (storedTheme === "system" && prefersDark)) {
        document.documentElement.classList.add("dark");
        isDarkMode = true;
      } else {
        document.documentElement.classList.remove("dark");
        isDarkMode = false;
      }
    }
    
    // 테마 토글
    function toggleTheme() {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
        isDarkMode = false;
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
        isDarkMode = true;
      }
    }
    
    // 패스워드 가시성 토글
    function togglePasswordVisibility() {
      const pwInput = DOM.loginPw;
      const icon = DOM.togglePasswordBtn.querySelector("i");
      
      if (pwInput.type === "password") {
        pwInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        pwInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    }
    
    // 사이드바 토글
    function toggleSidebar() {
      const sidebar = DOM.sidebar;
      const iconEl = DOM.collapseSidebarBtn.querySelector("i");
      const mainContent = DOM.mainContent;
      const sidebarTitle = document.getElementById("sidebar-title");
      
      sidebar.classList.toggle("sidebar-collapsed");
      mainContent.classList.toggle("main-content-expanded");
      
      const isCollapsed = sidebar.classList.contains("sidebar-collapsed");
      
      // 아이콘 회전 및 타이틀 숨김/표시
      if (isCollapsed) {
        iconEl.classList.remove("fa-chevron-left");
        iconEl.classList.add("fa-chevron-right");
        sidebarTitle.style.display = "none";
        document.querySelectorAll("#sidebar-list .sidebar-nav-text").forEach(el => {
          el.style.display = "none";
        });
      } else {
        iconEl.classList.remove("fa-chevron-right");
        iconEl.classList.add("fa-chevron-left");
        sidebarTitle.style.display = "block";
        document.querySelectorAll("#sidebar-list .sidebar-nav-text").forEach(el => {
          el.style.display = "block";
        });
      }
    }
    
    // 관리자 패널 토글
function toggleAdminPanel() {
  isAdminPanelOpen = !isAdminPanelOpen;
  
  if (isAdminPanelOpen) {
    DOM.adminPanel.classList.add("open");
    DOM.adminPanelOverlay.classList.add("open");
    
    // 사용자 관리 관련 DOM 요소 존재 확인
    console.log("adminContent 존재:", Boolean(document.getElementById("adminContent")));
    console.log("userListBtn 존재:", Boolean(document.getElementById("userListBtn")));
    console.log("userRegisterBtn 존재:", Boolean(document.getElementById("userRegisterBtn")));
    console.log("userListTableBody 존재:", Boolean(document.getElementById("userListTableBody")));
    console.log("userRegisterForm 존재:", Boolean(document.getElementById("userRegisterForm")));
    
    // 관리자 패널이 열릴 때 기본적으로 관리자 콘텐츠 영역 초기화
    const adminContent = document.getElementById("adminContent");
    if (adminContent) {
      adminContent.style.display = "none";
    }
    
    // 유저 관리 패널 초기화
    const userListPane = document.getElementById("adminUserListPane");
    const userRegisterPane = document.getElementById("adminUserRegisterPane");
    if (userListPane) userListPane.style.display = "none";
    if (userRegisterPane) userRegisterPane.style.display = "none";
  } else {
    DOM.adminPanel.classList.remove("open");
    DOM.adminPanelOverlay.classList.remove("open");
  }
}
    
    // 브라우저 정보 확인
    function getBrowserInfo() {
      const ua = navigator.userAgent;
      let browserName = "Unknown";
      let browserVersion = "";
      
      // Chrome
      if (ua.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)[1];
      }
      // Firefox
      else if (ua.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)[1];
      }
      // Safari
      else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
        browserName = "Safari";
        browserVersion = ua.match(/Version\/(\d+\.\d+)/)[1];
      }
      // Edge
      else if (ua.indexOf("Edg") > -1) {
        browserName = "Edge";
        browserVersion = ua.match(/Edg\/(\d+\.\d+)/)[1];
      }
      // Internet Explorer
      else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident/") > -1) {
        browserName = "Internet Explorer";
        
        if (ua.indexOf("MSIE") > -1) {
          browserVersion = ua.match(/MSIE (\d+\.\d+)/)[1];
        } else {
          browserVersion = ua.match(/rv:(\d+\.\d+)/)[1];
        }
      }
      
      return {
        name: browserName,
        version: browserVersion,
        userAgent: ua,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      };
    }
    
// 사용자 관리 초기화 함수를 전역 영역에 정의
function initUserManagement() {
  // 팝업창 관련 함수들 정의
  window.showPopup = function(title, content) {
    // 기존 팝업이 있으면 제거
    const existingPopup = document.getElementById("user-management-popup");
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }
    
    // 새 팝업 생성
    const popup = document.createElement("div");
    popup.id = "user-management-popup";
    popup.className = "fixed inset-0 flex items-center justify-center z-50";
    popup.innerHTML = `
      <div class="fixed inset-0 bg-black opacity-50"></div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-xl w-full relative z-10">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">${title}</h3>
          <button id="close-popup" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="popup-content" class="overflow-auto" style="max-height: 70vh;">
          ${content}
        </div>
      </div>
    `;
    
    // 문서에 팝업 추가
    document.body.appendChild(popup);
    
    // 닫기 버튼 이벤트 연결
    document.getElementById("close-popup").addEventListener("click", function() {
      document.body.removeChild(popup);
    });
    
    // 배경 클릭 시 팝업 닫기
    popup.addEventListener("click", function(e) {
      if (e.target === popup) {
        document.body.removeChild(popup);
      }
    });
  };

  // 유저 목록 보여주기 함수
  window.showUserList = function() {
    const content = `
      <div class="user-list">
        <table class="min-w-full border">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2 border text-gray-800 dark:text-gray-200">이름</th>
              <th class="px-4 py-2 border text-gray-800 dark:text-gray-200">이메일</th>
              <th class="px-4 py-2 border text-gray-800 dark:text-gray-200">권한</th>
              <th class="px-4 py-2 border text-gray-800 dark:text-gray-200">그룹</th>
            </tr>
          </thead>
          <tbody id="popup-userListTableBody">
            <!-- drawUserList() 함수에서 동적으로 채워집니다. -->
          </tbody>
        </table>
      </div>
    `;
    
    showPopup("유저 목록", content);
    
    // 팝업에 유저 목록 로드
    drawUserListForPopup();
  };

  // 유저 등록 폼 보여주기 함수
  window.showUserRegistration = function() {
    const content = `
      <form id="popup-userRegisterForm">
        <div class="form-group mb-4">
          <label for="popup-registerName" class="form-label">이름</label>
          <input id="popup-registerName" type="text" class="form-input" placeholder="이름 입력" required>
        </div>
        <div class="form-group mb-4">
          <label for="popup-registerEmail" class="form-label">이메일</label>
          <input id="popup-registerEmail" type="email" class="form-input" placeholder="이메일 입력" required>
        </div>
        <div class="form-group mb-4">
          <label for="popup-registerRole" class="form-label">권한</label>
          <select id="popup-registerRole" class="form-input" required>
            <option value="">선택하세요</option>
            <option value="사용자">사용자</option>
            <option value="관리자">관리자</option>
            <option value="슈퍼관리자">슈퍼관리자</option>
          </select>
        </div>
        <div class="form-group mb-4">
          <label for="popup-registerGroup" class="form-label">그룹</label>
          <input id="popup-registerGroup" type="text" class="form-input" placeholder="그룹 입력" required>
        </div>
        <div class="form-group mb-4">
          <label for="popup-registerPassword" class="form-label">비밀번호</label>
          <input id="popup-registerPassword" type="password" class="form-input" placeholder="비밀번호 입력" required>
        </div>
        <button type="submit" class="btn-primary w-full">유저 등록</button>
      </form>
    `;
    
    showPopup("유저 등록", content);
    
    // 팝업 내 폼 이벤트 연결
    document.getElementById("popup-userRegisterForm").addEventListener("submit", function(e) {
      e.preventDefault();
      
      // 입력값 가져오기
      const name = document.getElementById("popup-registerName").value.trim();
      const email = document.getElementById("popup-registerEmail").value.trim();
      const role = document.getElementById("popup-registerRole").value;
      const group = document.getElementById("popup-registerGroup").value.trim();
      const password = document.getElementById("popup-registerPassword").value;
      
      // 입력값 검증
      if (!name || !email || !role || !group || !password) {
        showToast("모든 필드를 입력해주세요.", true);
        return;
      }
      
      // Firebase Auth로 계정 생성
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function(userCredential) {
          const user = userCredential.user;
          
          // 사용자 정보 생성
          const userData = {
            displayName: name,
            email: email,
            role: role,
            group: group,
            createdAt: new Date().toISOString()
          };
          
          // Firebase DB에 사용자 정보 저장
          return firebase.database().ref("users/" + user.uid).set(userData);
        })
        .then(function() {
          showToast("유저 등록이 완료되었습니다.");
          
          // 폼 초기화
          document.getElementById("popup-userRegisterForm").reset();
          
          // 팝업 닫기
          const popup = document.getElementById("user-management-popup");
          if (popup) {
            document.body.removeChild(popup);
          }
          
          // 유저 목록 보여주기
          showUserList();
        })
        .catch(function(error) {
          console.error("유저 등록 실패:", error);
          showToast("유저 등록 실패: " + error.message, true);
        });
    });
  };

window.drawUserListForPopup = function() {
  const tbody = document.getElementById("popup-userListTableBody");
  if (!tbody) {
    console.error("popup-userListTableBody 요소를 찾을 수 없습니다.");
    return;
  }
  
  // 테이블 내용 비우기
  tbody.innerHTML = "";
  
  // Firebase에서 유저 데이터 가져오기
  firebase.database().ref("users").once("value")
    .then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        const user = childSnapshot.val();
        const userId = childSnapshot.key; // Firebase에서 유저의 key를 id로 사용
        const tr = document.createElement("tr");
        
        // 각 컬럼 생성
        const tdName = document.createElement("td");
        tdName.className = "px-4 py-2 border";
        tdName.textContent = user.displayName || "";
        
        const tdEmail = document.createElement("td");
        tdEmail.className = "px-4 py-2 border";
        tdEmail.textContent = user.email || "";
        
        const tdRole = document.createElement("td");
        tdRole.className = "px-4 py-2 border";
        tdRole.textContent = user.role || "";
        
        const tdGroup = document.createElement("td");
        tdGroup.className = "px-4 py-2 border";
        tdGroup.textContent = user.group || "";
        
        const tdEdit = document.createElement("td");
        tdEdit.className = "px-4 py-2 border text-center";
        // 수정 버튼 생성
        const editBtn = document.createElement("button");
        editBtn.className = "btn-primary px-3 py-1 text-sm";
        editBtn.textContent = "수정";
        editBtn.addEventListener("click", function() {
          showUserEdit(userId, user);
        });
        tdEdit.appendChild(editBtn);
        
        // 행에 컬럼 추가
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdRole);
        tr.appendChild(tdGroup);
        tr.appendChild(tdEdit);
        
        // 테이블에 행 추가
        tbody.appendChild(tr);
      });
    })
    .catch(function(error) {
      console.error("유저 목록 로딩 실패:", error);
      showToast("유저 목록 로딩 실패: " + error.message, true);
    });
};

  // 사용자 관리 버튼 이벤트 연결
  const userListBtn = document.getElementById("userListBtn");
  const userRegisterBtn = document.getElementById("userRegisterBtn");
  
  if (userListBtn) {
    userListBtn.addEventListener("click", function() {
      showUserList();
    });
  } else {
    console.error("userListBtn 요소를 찾을 수 없습니다.");
  }
  
  if (userRegisterBtn) {
    userRegisterBtn.addEventListener("click", function() {
      showUserRegistration();
    });
  } else {
    console.error("userRegisterBtn 요소를 찾을 수 없습니다.");
  }
}

document.addEventListener("DOMContentLoaded", function() {
  // 다크 모드 설정 초기화
  initTheme();
  
  // 패스워드 토글 버튼 이벤트 리스너
  DOM.togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  
  // 검색창 이벤트 리스너 
  DOM.searchInput.addEventListener("input", function() {
    DOM.clearSearchBtn.style.display = this.value ? "flex" : "none";
    searchChatbots();
  });
  
  // 검색 지우기 버튼 이벤트 리스너
  DOM.clearSearchBtn.addEventListener("click", function() {
    DOM.searchInput.value = "";
    DOM.clearSearchBtn.style.display = "none";
    searchChatbots();
  });
  
  // 로그인 폼 엔터 키 이벤트 리스너
  DOM.loginEmail.addEventListener("keyup", function(e) {
    if (e.key === "Enter") DOM.loginPw.focus();
  });
  
  DOM.loginPw.addEventListener("keyup", function(e) {
    if (e.key === "Enter") handleLogin();
  });
  
  // 로그인 버튼 클릭 이벤트 리스너
  DOM.loginBtn.addEventListener("click", handleLogin);
  
  // 비밀번호 재설정 버튼 클릭 이벤트 리스너
  DOM.resetPasswordBtn.addEventListener("click", resetPassword);
  
  // 로그아웃 버튼 클릭 이벤트 리스너
  DOM.logoutBtn.addEventListener("click", logout);
  
  // 모바일 메뉴 버튼 이벤트 리스너
  DOM.mobileMenuBtn.addEventListener("click", function() {
    DOM.sidebar.classList.toggle("open");
  });
  
  // 사이드바 축소 버튼 이벤트 리스너
  DOM.collapseSidebarBtn.addEventListener("click", toggleSidebar);
  
  // 테마 토글 버튼 이벤트 리스너
  DOM.themeToggle.addEventListener("click", toggleTheme);
  
  // 토스트 닫기 버튼 이벤트 리스너
  document.querySelector('.toast-close').addEventListener('click', function() {
    hideToast();
  });
  
  // 관리자 패널 관련 이벤트 리스너
  DOM.adminBtn.addEventListener("click", toggleAdminPanel);
  DOM.closeAdminPanelBtn.addEventListener("click", toggleAdminPanel);
  DOM.adminPanelOverlay.addEventListener("click", toggleAdminPanel);
  
  // 세션 드롭다운 토글 이벤트 리스너
  DOM.sessionDropdownToggle.addEventListener("click", function() {
    DOM.sessionDropdownMenu.classList.toggle("show");
  });
  
  // 세션 드롭다운 외부 클릭 감지 이벤트 리스너
  document.addEventListener("click", function(event) {
    if (!DOM.sessionDropdownToggle.contains(event.target) && !DOM.sessionDropdownMenu.contains(event.target)) {
      DOM.sessionDropdownMenu.classList.remove("show");
    }
  });
  
  // 엑셀 파일 선택 이벤트 리스너 수정
  DOM.excelFileInput.addEventListener("change", function() {
    if (this.files.length > 0) {
      DOM.excelFilename.textContent = this.files[0].name;
      // 파일 선택 시 바로 파싱 작업 진행
      uploadExcelData();
    } else {
      DOM.excelFilename.textContent = "선택된 파일 없음";
    }
  });

  // 엑셀 버튼 이벤트 설정
  document.getElementById("replace-excel-upload").addEventListener("click", function() {
    processExcelData("replace", window.excelGroupsData, window.excelSessionsData, window.excelChatbotsData);
  });

  document.getElementById("merge-excel-upload").addEventListener("click", function() {
    processExcelData("merge", window.excelGroupsData, window.excelSessionsData, window.excelChatbotsData);
  });

  document.getElementById("cancel-excel-upload").addEventListener("click", function() {
    closeExcelUploadModal();
    showToast("업로드가 취소되었습니다.", true);
  });

  document.getElementById("close-excel-modal").addEventListener("click", function() {
    closeExcelUploadModal();
  });
  
  // 사용자 관리 기능 초기화
  initUserManagement();
  
  // 모바일 디바이스 감지 및 처리
  checkMobileDevice();
  
  // 윈도우 리사이즈 이벤트 리스너
  window.addEventListener("resize", checkMobileDevice);
  
  // 초기 로딩이 완료되면 로그인 화면 표시
  setTimeout(() => {
    DOM.initialLoader.style.display = "none";
    DOM.loginContainer.style.display = "flex";
  }, 1000);
});

function showUserEdit(userId, userData) {
  // 유저 등록 폼과 동일한 구성으로 수정 폼을 생성(이메일은 수정하지 않도록 readonly 처리)
  const content = `
    <form id="popup-userEditForm">
      <div class="form-group mb-4">
        <label for="popup-editName" class="form-label">이름</label>
        <input id="popup-editName" type="text" class="form-input" placeholder="이름 입력" required value="${userData.displayName || ''}">
      </div>
      <div class="form-group mb-4">
        <label for="popup-editEmail" class="form-label">이메일</label>
        <input id="popup-editEmail" type="email" class="form-input" placeholder="이메일 입력" required value="${userData.email || ''}" readonly>
      </div>
      <div class="form-group mb-4">
        <label for="popup-editRole" class="form-label">권한</label>
        <select id="popup-editRole" class="form-input" required>
          <option value="">선택하세요</option>
          <option value="사용자" ${userData.role === "사용자" ? "selected" : ""}>사용자</option>
          <option value="관리자" ${userData.role === "관리자" ? "selected" : ""}>관리자</option>
          <option value="슈퍼관리자" ${userData.role === "슈퍼관리자" ? "selected" : ""}>슈퍼관리자</option>
        </select>
      </div>
      <div class="form-group mb-4">
        <label for="popup-editGroup" class="form-label">그룹</label>
        <input id="popup-editGroup" type="text" class="form-input" placeholder="그룹 입력" required value="${userData.group || ''}">
      </div>
      <!-- 비밀번호 수정 항목은 필요 시 추가 -->
      <button type="submit" class="btn-primary w-full">유저 수정</button>
    </form>
  `;
  
  showPopup("유저 수정", content);
  
  document.getElementById("popup-userEditForm").addEventListener("submit", function(e) {
    e.preventDefault();
    
    // 수정된 값 가져오기
    const updatedUser = {
      displayName: document.getElementById("popup-editName").value.trim(),
      // 이메일은 readonly로 수정 불가
      role: document.getElementById("popup-editRole").value,
      group: document.getElementById("popup-editGroup").value.trim()
      // 필요하다면 비밀번호 변경 로직을 추가할 수 있음
    };
    
    // Firebase DB 업데이트
    firebase.database().ref("users/" + userId)
      .update(updatedUser)
      .then(function() {
        showToast("유저 수정이 완료되었습니다.");
        // 팝업 닫기
        const popup = document.getElementById("user-management-popup");
        if (popup) {
          document.body.removeChild(popup);
        }
        // 수정된 내용이 반영되도록 유저 목록 다시 그리기
        drawUserListForPopup();
      })
      .catch(function(error) {
        console.error("유저 수정 실패:", error);
        showToast("유저 수정 실패: " + error.message, true);
      });
  });
}


    /****************************************
     4) 토스트 메시지 함수
    *****************************************/
    function showToast(message, isError = false, title = '') {
      const toast = DOM.toast;
      const iconContainer = toast.querySelector('.toast-icon');
      const titleEl = toast.querySelector('.toast-title');
      const messageEl = toast.querySelector('.toast-message');
      
      // 토스트 유형에 따른 스타일 설정
      toast.className = 'toast';
      if (isError) {
        toast.classList.add('toast-error');
        iconContainer.innerHTML = '<i class="fas fa-times"></i>';
      } else {
        toast.classList.add('toast-success');
        iconContainer.innerHTML = '<i class="fas fa-check"></i>';
      }
      
      // 제목 및 메시지 설정
      titleEl.textContent = title || (isError ? '오류' : '성공');
      messageEl.textContent = message;
      
      // 토스트 표시
      toast.classList.add('show');
      
      // 타이머 설정으로 토스트 자동 숨김
      setTimeout(hideToast, 3000);
    }
    
    function hideToast() {
      const toast = DOM.toast;
      toast.classList.remove('show');
    }
    
    /****************************************
     5) Firebase Auth 및 로그인 처리
    *****************************************/
    // Auth 상태 변경 리스너
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        currentUid = user.uid;
        
        // 사용자 데이터 로드
        db.ref("users/" + user.uid)
          .once("value")
          .then(snap => {
            if (!snap.exists()) {
              // 신규 사용자 정보 저장
              const userData = {
                email: user.email,
                role: "사용자",
                displayName: user.displayName || user.email.split("@")[0],
                lastLogin: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                status: "active"
              };
              
              // Firebase에 사용자 정보 저장
              db.ref("users/" + user.uid).set(userData);
              return userData;
            } else {
              // 기존 사용자 마지막 로그인 시간 업데이트
              db.ref("users/" + user.uid + "/lastLogin").set(new Date().toISOString());
              return snap.val();
            }
          })
          .then(userData => {
            // 사용자 권한 저장 및 UI 업데이트
            userRole = userData.role;
            
            // UI 업데이트: 로그인 화면 숨기고 앱 컨테이너 표시
            DOM.loginContainer.style.display = "none";
            DOM.appContainer.style.display = "flex";
            
            // 사용자 정보 표시
            DOM.userNameEl.textContent = userData.displayName || userData.email;
            DOM.userRoleEl.textContent = userData.role;
            
            // 관리자 버튼 표시 여부 설정
            DOM.adminBtn.style.display =
              userData.role === "관리자" || userData.role === "슈퍼관리자" ? "inline-block" : "none";
            
            // 모든 데이터 로드를 Promise.all로 병렬 실행
            Promise.all([
              loadChatbotGroups(),
              loadChatbotsData(),
              loadGroupSessions()
            ]).then(() => {
              // 추가 데이터 로드 및 초기 화면 설정
              loadSubgroups();
              
              // 기본 그룹이 없는 경우 생성
              if (!chatbotGroups.length) {
                chatbotGroups.push({ 
                  id: Date.now(), 
                  name: "기본 그룹", 
                  type: "custom", 
                  chatbots: [],
                  createdAt: new Date().toISOString(),
                  createdBy: currentUid
                });
              }
              
              // 첫 번째 그룹 선택
              selectGroup(chatbotGroups[0].id);
              
              // 로그인 성공 메시지 표시
              showToast(`환영합니다, ${userData.displayName || userData.email}님!`);
              
              // 로그인 활동 로깅
              logUserActivity("login");
            }).catch(err => {
              console.error("데이터 로드 오류:", err);
              showToast("데이터 로드에 문제가 발생했습니다.", true);
            });
          })
          .catch(err => {
            console.error("사용자 정보 로드 실패:", err);
            showToast("사용자 정보를 로드하는 데 실패했습니다.", true);
            auth.signOut();
          });
      } else {
        // 로그아웃 상태 처리
        currentUser = null;
        currentUid = null;
        userRole = "사용자";
        
        // UI 업데이트: 앱 컨테이너 숨기고 로그인 화면 표시
        DOM.appContainer.style.display = "none";
        DOM.loginContainer.style.display = "flex";
      }
    });
    
    // 로그인 처리 함수
    function handleLogin() {
      const emailVal = DOM.loginEmail.value.trim();
      const pwVal = DOM.loginPw.value.trim();
      const rememberMe = DOM.rememberMeCheckbox.checked;
      
      // 입력 유효성 검사
      if (!emailVal || !pwVal) {
        showLoginError("이메일과 비밀번호를 입력하세요");
        return;
      }
      
      // 로그인 버튼 비활성화 및 로딩 상태 표시
      DOM.loginBtn.disabled = true;
      DOM.loginBtn.innerHTML = '<span class="loading-spinner"></span>로그인 중...';
      
      // 로그인 유지 설정
      const persistence = rememberMe 
        ? firebase.auth.Auth.Persistence.LOCAL 
        : firebase.auth.Auth.Persistence.SESSION;
      
      // 영구 로그인 설정 후 로그인 시도
      auth.setPersistence(persistence)
        .then(() => {
          return auth.signInWithEmailAndPassword(emailVal, pwVal);
        })
        .catch(err => {
          console.error("로그인 실패:", err);
          
          // 오류 메시지 사용자 친화적으로 표시
          let errorMessage = "로그인에 실패했습니다.";
          
          if (err.code === "auth/user-not-found")
            errorMessage = "등록되지 않은 이메일입니다.";
          else if (err.code === "auth/wrong-password")
            errorMessage = "비밀번호가 올바르지 않습니다.";
          else if (err.code === "auth/invalid-email")
            errorMessage = "유효하지 않은 이메일 형식입니다.";
          else if (err.code === "auth/too-many-requests")
            errorMessage = "너무 많은 로그인 시도로 계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도해주세요.";
          else if (err.code === "auth/network-request-failed")
            errorMessage = "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.";
          
          showLoginError(errorMessage);
          
          // 버튼 상태 복원
          DOM.loginBtn.disabled = false;
          DOM.loginBtn.innerHTML = "로그인";
        });
    }
    
    // 로그인 오류 표시
    function showLoginError(message) {
      const alertEl = DOM.loginAlert;
      alertEl.textContent = message;
      alertEl.style.display = "block";
      
      // 5초 후 알림 숨김
      setTimeout(() => {
        alertEl.style.display = "none";
      }, 5000);
    }
    
    // 로그아웃 함수
    function logout() {
      // 로그아웃 확인
      if (!confirm("로그아웃 하시겠습니까?")) return;
      
      // 로그아웃 활동 로깅
      if (currentUid) logUserActivity("logout");
      
      // Firebase 로그아웃
      auth.signOut()
        .then(() => {
          // 상태 초기화
          currentUser = null;
          currentUid = null;
          userRole = "사용자";
          
          // 입력 필드 초기화
          DOM.loginEmail.value = "";
          DOM.loginPw.value = "";
          
          // 로그아웃 알림
          showToast("로그아웃 되었습니다.");
        })
        .catch(err => {
          console.error("로그아웃 실패:", err);
          showToast("로그아웃 실패: " + err.message, true);
        });
    }
    
    // 비밀번호 재설정 함수
    function resetPassword() {
      const emailVal = DOM.loginEmail.value.trim();
      
      // 이메일 유효성 검사
      if (!emailVal) {
        showLoginError("비밀번호 변경을 위해 이메일을 입력하세요.");
        return;
      }
      
      // 비밀번호 재설정 메일 전송
      auth.sendPasswordResetEmail(emailVal)
        .then(() => {
          showToast("비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인하세요.");
        })
        .catch(err => {
          // 오류 메시지 사용자 친화적으로 표시
          let errorMessage = "비밀번호 변경 이메일 발송 실패";
          
          if (err.code === "auth/invalid-email")
            errorMessage = "유효하지 않은 이메일 형식입니다.";
          else if (err.code === "auth/user-not-found")
            errorMessage = "등록되지 않은 이메일입니다.";
          
          showLoginError(errorMessage);
        });
    }
    
    /****************************************
     6) 기본 챗봇 데이터 로드 (Firebase 연동)
    *****************************************/
    function loadChatbotsData() {
      return db.ref("chatbots")
        .once("value")
        .then(snapshot => {
          if (snapshot.exists()) {
            defaultChatbots = snapshot.val();
          } else {
            // 기본 데이터가 없는 경우 초기화
            defaultChatbots = chatbotData;
            return db.ref("chatbots")
              .set(chatbotData)
              .then(() => { 
                logUserActivity("initialize_chatbots", { description: "기본 챗봇 데이터 초기화" });
              });
          }
        })
        .catch(err => {
          console.error("Firebase chatbots 데이터 로드 실패:", err);
          showToast("챗봇 데이터를 로드하는 데 실패했습니다.", true);
        });
    }
    
    /****************************************
     7) 사용자 활동 로깅
    *****************************************/
    function logUserActivity(activityType, details = {}) {
      if (!currentUid) return;
      
      // 활동 로그 객체 생성
      const activityLog = {
        userId: currentUid,
        email: currentUser.email,
        displayName: currentUser ? (currentUser.displayName || currentUser.email.split("@")[0]) : "Unknown User",
        activityType: activityType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: "client-side-only", // 보안 상 클라이언트에서는 실제 IP를 기록하지 않음,
        ...details
      };
      
      // Firebase에 로그 저장
      db.ref("activityLogs")
        .push(activityLog)
        .catch(err => { console.error("활동 로깅 실패:", err); });
    }
    
    /****************************************
     8) 권한 확인
    *****************************************/
    function checkPermission(requiredRole = "관리자", showMessage = true) {
      // 사용자 권한 확인
      if (userRole !== requiredRole && userRole !== "슈퍼관리자") {
        if (showMessage) {
          showToast(`이 작업은 ${requiredRole} 권한이 필요합니다.`, true);
        }
        return false;
      }
      return true;
    }
    
    /****************************************
     9) 챗봇 그룹 데이터 로드
    *****************************************/
    function loadChatbotGroups() {
      return db.ref("chatbotGroups")
        .once("value")
        .then(snapshot => {
          if (snapshot.exists()) {
            // 데이터 형식에 따라 처리
            chatbotGroups = snapshot.val();
            if (!Array.isArray(chatbotGroups)) {
              chatbotGroups = Object.values(chatbotGroups);
            }
          } else {
            // 기본 그룹 생성
            chatbotGroups = [{ 
              id: Date.now(), 
              name: "기본 그룹", 
              type: "custom", 
              chatbots: [],
              createdAt: new Date().toISOString(),
              createdBy: currentUid || "system"
            }];
            
            // Firebase에 기본 그룹 저장
            db.ref("chatbotGroups").set(chatbotGroups)
              .then(() => { 
                logUserActivity("initialize_data", { description: "기본 챗봇 그룹 초기화" }); 
              });
          }
          
          // 사이드바 업데이트
          renderSidebar();
          
          return chatbotGroups;
        })
        .catch(error => {
          console.error("Firebase 데이터 로드 실패:", error);
          showToast("그룹 데이터를 로드하는 데 실패했습니다.", true);
        });
    }
    
    /****************************************
     10) 사이드바 렌더링
    *****************************************/
    function renderSidebar() {
      // DOM 요소 가져오기
      const sidebarList = DOM.sidebarList;
      
      // 이전 내용 비우기
      sidebarList.innerHTML = "";
      
      // 사이드바가 축소되었는지 확인
      const isCollapsed = DOM.sidebar.classList.contains("sidebar-collapsed");
      
      // "전체" 항목 생성
      const allItem = document.createElement("a");
      allItem.href = "#";
      allItem.className = `sidebar-nav-item ${selectedGroupId === "all" ? "active" : ""}`;
      allItem.dataset.id = "all";
      
      allItem.innerHTML = `
        <span class="sidebar-nav-icon">
          <i class="fas fa-th-large"></i>
        </span>
        <span class="sidebar-nav-text" ${isCollapsed ? 'style="display:none"' : ''}>전체</span>
      `;
      
      // "전체" 클릭 이벤트 추가
      allItem.onclick = (e) => {
        e.preventDefault();
        selectAllGroups();
      };
      
      // 사이드바에 "전체" 항목 추가
      sidebarList.appendChild(allItem);
      
      // 각 그룹에 대해 아이템 생성
      chatbotGroups.forEach(group => {
        const li = document.createElement("a");
        li.href = "#";
        li.className = `sidebar-nav-item ${group.id === selectedGroupId ? "active" : ""}`;
        li.dataset.id = group.id;
        
        li.innerHTML = `
          <span class="sidebar-nav-icon">
            <i class="fas ${getGroupIcon(group.type)}"></i>
          </span>
          <span class="sidebar-nav-text" ${isCollapsed ? 'style="display:none"' : ''}>${group.name}</span>
        `;
        
        // 클릭 이벤트 추가
        li.onclick = (e) => {
          e.preventDefault();
          selectGroup(group.id);
        };
        
        // 사이드바에 추가
        sidebarList.appendChild(li);
      });
    }
    
    // 그룹 타입에 따른 아이콘 반환
    function getGroupIcon(type) {
      switch (type) {
        case "customerSupport": return "fa-headset";
        case "aiTool": return "fa-robot";
        case "knowledge": return "fa-brain";
        case "business": return "fa-briefcase";
        case "analytics": return "fa-chart-bar";
        default: return "fa-folder";
      }
    }
    
    /****************************************
     11) 그룹별 세션 데이터 로드 및 렌더링
    *****************************************/
    function loadGroupSessions() {
      return db.ref("groupSessions")
        .once("value")
        .then(snapshot => {
          if (snapshot.exists()) {
            // 데이터 형식에 따라 처리
            groupSessions = snapshot.val();
          } else {
            // 기본 세션 데이터 초기화
            groupSessions = {};
            
            // 각 그룹별 기본 세션 설정
            chatbotGroups.forEach(group => {
              groupSessions[group.id] = defaultSessions.slice();
            });
            
            // Firebase에 기본 세션 저장
            return db.ref("groupSessions").set(groupSessions)
              .then(() => { 
                logUserActivity("initialize_group_sessions", { description: "그룹별 세션 초기화" }); 
              });
          }
          
          return groupSessions;
        })
        .catch(err => {
          console.error("그룹별 세션 데이터 로드 실패:", err);
          showToast("세션 데이터를 로드하는 데 실패했습니다.", true);
          
          // 오류 시 기본값으로 설정
          groupSessions = {};
          chatbotGroups.forEach(group => {
            groupSessions[group.id] = defaultSessions.slice();
          });
          
          return groupSessions;
        });
    }
    
function renderSessionDropdown(groupId) {
  const sessionDropdownMenu = DOM.sessionDropdownMenu;
  sessionDropdownMenu.innerHTML = "";
  
  // 그룹이 "전체"로 선택된 경우: 모든 그룹의 세션을 가져와 "그룹명 + 세션명" 형태로 표시
  if (groupId === "all") {
    // 전체 항목 먼저 추가
    const allItem = document.createElement("a");
    allItem.href = "#";
    allItem.className = `session-dropdown-item ${activeSession === "all" ? "active" : ""}`;
    allItem.innerHTML = `<i class="fas fa-bars mr-2"></i>전체`;
    allItem.onclick = (e) => {
      e.preventDefault();
      switchSession("all", "전체");
    };
    sessionDropdownMenu.appendChild(allItem);
    
    // 각 그룹의 세션 추가
    chatbotGroups.forEach(group => {
      // 각 그룹에 등록된 세션 목록 (없으면 기본 세션 사용)
      const sessions = groupSessions[group.id] || defaultSessions;
      // "전체" 외의 세션만 표시
      const customSessions = sessions.filter(s => s.id !== "all");
      
      if (customSessions.length > 0) {
        customSessions.forEach(session => {
          const item = document.createElement("a");
          item.href = "#";
          
          // 그룹 이름과 세션명을 결합해서 표시 (예: "고객지원 - 세션 예시")
          const displayText = group.name + " - " + session.title;
          
          item.className = "session-dropdown-item";
          const icon = sessionInfo[session.id]?.icon || "fa-tag";
          item.innerHTML = `<i class="fas ${icon} mr-2"></i>${displayText}`;
          
          item.onclick = (e) => {
            e.preventDefault();
            // 세션 전환 시, 수정된 표시 텍스트(displayText)를 함께 전달
            switchSession(session.id, displayText);
          };
          
          sessionDropdownMenu.appendChild(item);
        });
      }
    });
  } else {
    // "전체" 외의 그룹은 기존 방식대로 처리
    const sessions = groupSessions[groupId] || defaultSessions;
    
    sessions.forEach(session => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = `session-dropdown-item ${session.id === activeSession ? "active" : ""}`;
      const icon = sessionInfo[session.id]?.icon || "fa-tag";
      item.innerHTML = `<i class="fas ${icon} mr-2"></i>${session.title}`;
      
      item.onclick = (e) => {
        e.preventDefault();
        switchSession(session.id, session.title);
      };
      
      sessionDropdownMenu.appendChild(item);
    });
  }
}

    
    // 세션 전환
    function switchSession(sessionId, sessionTitle) {
      // 활성 세션 저장
      activeSession = sessionId;
      
      // 드롭다운 메뉴 닫기
      DOM.sessionDropdownMenu.classList.remove("show");
      
      // 현재 세션 표시 업데이트
      DOM.currentSessionName.textContent = sessionTitle || sessionInfo[sessionId]?.title || "전체";
      
      // 드롭다운 메뉴 업데이트
      const items = DOM.sessionDropdownMenu.querySelectorAll(".session-dropdown-item");
      items.forEach(item => {
        if (item.textContent.trim() === sessionTitle) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });
      
      // 선택된 그룹 확인 및 콘텐츠 업데이트
      if (selectedGroupId === "all") {
        renderAllGroupsContent();
      } else {
        const group = chatbotGroups.find(g => g.id == selectedGroupId);
        if (group) renderContentForGroup(group);
      }
      
      // 활동 로깅
      logUserActivity("switch_session", { sessionId, sessionTitle });
    }
    
    // 세션 추가 (그룹별)
    function addSessionToGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("세션을 추가할 그룹을 선택하세요.", true);
        return;
      }
      
      // 세션 이름 입력 요청
      const title = prompt("추가할 세션 이름을 입력하세요:");
      if (!title) return;
      
      // 현재 그룹의 세션 목록
      const sessions = groupSessions[selectedGroupId] || defaultSessions.slice();
      
      // 중복 확인
      if (sessions.find(s => s.title === title)) {
        showToast("이미 동일한 세션 이름이 존재합니다.", true);
        return;
      }
      
      // 새 세션 생성
      const newSession = { 
        id: Date.now().toString(), 
        title: title,
        createdAt: new Date().toISOString(),
        createdBy: currentUid
      };
      
      // 세션 목록에 추가
      sessions.push(newSession);
      
      // 그룹 세션 업데이트
      groupSessions[selectedGroupId] = sessions;
      
      // Firebase에 세션 저장
      db.ref(`groupSessions/${selectedGroupId}`)
        .set(sessions)
        .then(() => {
          // 활동 로깅
          logUserActivity("add_session", { 
            groupId: selectedGroupId, 
            sessionId: newSession.id, 
            title: newSession.title 
          });
          
          // 성공 메시지 표시
          showToast(`"${title}" 세션이 추가되었습니다.`);
          
          // UI 업데이트
          renderSessionDropdown(selectedGroupId);
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("세션 추가 실패:", err);
          showToast("세션 추가 실패", true);
        });
    }
    
    // 세션 수정 (그룹별)
    function editSessionInGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("세션을 수정할 그룹을 선택하세요.", true);
        return;
      }
      
      // 현재 그룹의 세션 목록
      const sessions = groupSessions[selectedGroupId] || defaultSessions.slice();
      
      // "전체" 세션 제외한 목록
      const editableSessions = sessions.filter(s => s.id !== "all");
      
      if (editableSessions.length === 0) {
        showToast("수정할 세션이 없습니다.", true);
        return;
      }
      
      // 세션 목록 문자열 생성
      let listStr = "수정할 세션 번호를 선택하세요:\n";
      editableSessions.forEach((session, idx) => {
        listStr += `${idx + 1}. ${session.title}\n`;
      });
      
      // 수정할 세션 입력 요청
      const choice = prompt(listStr);
      if (!choice) return;
      
      const choiceNum = parseInt(choice) - 1;
      if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= editableSessions.length) {
        showToast("유효한 번호를 선택하세요.", true);
        return;
      }
      
      // 선택된 세션
      const sessionToEdit = editableSessions[choiceNum];
      
      // 새 이름 입력 요청
      const newTitle = prompt("새로운 세션 이름을 입력하세요:", sessionToEdit.title);
      if (!newTitle || newTitle === sessionToEdit.title) {
        showToast("세션 이름이 변경되지 않았습니다.", true);
        return;
      }
      
      // 세션 이름 업데이트
      sessionToEdit.title = newTitle;
      sessionToEdit.updatedAt = new Date().toISOString();
      sessionToEdit.updatedBy = currentUid;
      
      // Firebase에 변경사항 저장
      db.ref(`groupSessions/${selectedGroupId}`)
        .set(sessions)
        .then(() => {
          // 활동 로깅
          logUserActivity("edit_session", { 
            groupId: selectedGroupId,
            sessionId: sessionToEdit.id, 
            newTitle: newTitle 
          });
          
          // 성공 메시지 표시
          showToast(`세션 이름이 "${newTitle}"으로 수정되었습니다.`);
          
          // UI 업데이트
          renderSessionDropdown(selectedGroupId);
          
          // 현재 활성 세션이 수정된 경우 이름 업데이트
          if (activeSession === sessionToEdit.id) {
            DOM.currentSessionName.textContent = newTitle;
          }
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("세션 수정 실패:", err);
          showToast("세션 수정 실패", true);
        });
    }
    
    // 세션 삭제 (그룹별)
    function deleteSessionFromGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("세션을 삭제할 그룹을 선택하세요.", true);
        return;
      }
      
      // 현재 그룹의 세션 목록
      let sessions = groupSessions[selectedGroupId] || defaultSessions.slice();
      
      // "전체" 세션 제외한 목록
      const deletableSessions = sessions.filter(s => s.id !== "all");
      
      if (deletableSessions.length === 0) {
        showToast("삭제할 세션이 없습니다.", true);
        return;
      }
      
      // 세션 목록 문자열 생성
      let listStr = "삭제할 세션 번호를 선택하세요:\n";
      deletableSessions.forEach((session, idx) => {
        listStr += `${idx + 1}. ${session.title}\n`;
      });
      
      // 삭제할 세션 입력 요청
      const choice = prompt(listStr);
      if (!choice) return;
      
      const choiceNum = parseInt(choice) - 1;
      if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= deletableSessions.length) {
        showToast("유효한 번호를 선택하세요.", true);
        return;
      }
      
      // 선택된 세션
      const sessionToDelete = deletableSessions[choiceNum];
      
      // 삭제 확인
      if (!confirm(`"${sessionToDelete.title}" 세션을 삭제하시겠습니까?`)) return;
      
      // 해당 세션에 속한 챗봇 확인
      const group = chatbotGroups.find(g => g.id == selectedGroupId);
      if (group && group.chatbots) {
        const chatbotsInSession = group.chatbots.filter(bot => bot.session === sessionToDelete.id);
        
        if (chatbotsInSession.length > 0) {
          const moveChats = confirm(`이 세션에 속한 ${chatbotsInSession.length}개의 챗봇이 있습니다. 이 챗봇들을 "전체" 세션으로 이동하시겠습니까? (취소 시 챗봇도 함께 삭제됩니다)`);
          
          if (moveChats) {
            // 챗봇 세션 변경
            group.chatbots.forEach(bot => {
              if (bot.session === sessionToDelete.id) {
                bot.session = "all";
                bot.updatedAt = new Date().toISOString();
                bot.updatedBy = currentUid;
              }
            });
          } else {
            // 해당 세션의 챗봇 삭제
            group.chatbots = group.chatbots.filter(bot => bot.session !== sessionToDelete.id);
          }
        }
      }
      
      // 세션 목록에서 삭제
      sessions = sessions.filter(s => s.id !== sessionToDelete.id);
      groupSessions[selectedGroupId] = sessions;
      
      // Firebase에 변경사항 저장 (세션 및 챗봇)
      Promise.all([
        db.ref(`groupSessions/${selectedGroupId}`).set(sessions),
        group ? db.ref(`chatbotGroups/${chatbotGroups.indexOf(group)}`).set(group) : Promise.resolve()
      ])
        .then(() => {
          // 활동 로깅
          logUserActivity("delete_session", { 
            groupId: selectedGroupId,
            sessionId: sessionToDelete.id, 
            title: sessionToDelete.title 
          });
          
          // 성공 메시지 표시
          showToast(`"${sessionToDelete.title}" 세션이 삭제되었습니다.`);
          
          // 현재 활성 세션이 삭제된 경우 "전체"로 변경
          if (activeSession === sessionToDelete.id) {
            activeSession = "all";
            DOM.currentSessionName.textContent = "전체";
          }
          
          // UI 업데이트
          renderSessionDropdown(selectedGroupId);
          
          if (group) renderContentForGroup(group);
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("세션 삭제 실패:", err);
          showToast("세션 삭제 실패", true);
        });
    }
    
    /****************************************
     12) 그룹 선택 및 콘텐츠 렌더링
    *****************************************/
    // 모든 그룹 선택 (전체 보기)
    function selectAllGroups() {
      // 선택된 그룹 ID 저장
      selectedGroupId = "all";
      
      // 활성 세션 초기화
      activeSession = "all";
      DOM.currentSessionName.textContent = "전체";
      
      // 기본 세션 사용 (전체 그룹용)
      renderSessionDropdown("all");
      
      // 사이드바 선택 상태 업데이트
      renderSidebar();
      
      // 모바일 사이드바 닫기
      if (window.innerWidth <= 1024) {
        DOM.sidebar.classList.remove("open");
      }
      
      // 삭제 모드 초기화
      deleteMode = false;
      
      // 활동 로깅
      logUserActivity("select_all_groups");
      
      // 페이지 제목 업데이트
      DOM.pageTitle.textContent = "전체 챗봇";
      
      // 모든 그룹 콘텐츠 렌더링
      renderAllGroupsContent();
    }
    
    // 특정 그룹 선택
    function selectGroup(groupId) {
      // 전체 그룹인 경우
      if (groupId === "all") {
        selectAllGroups();
        return;
      }
      
      // 선택된 그룹 ID 저장
      selectedGroupId = groupId;
      
      // 활성 세션 초기화
      activeSession = "all";
      DOM.currentSessionName.textContent = "전체";
      
      // 해당 그룹의 세션 드롭다운 렌더링
      renderSessionDropdown(groupId);
      
      // 사이드바 선택 상태 업데이트
      renderSidebar();
      
      // 선택된 그룹 찾기
      const group = chatbotGroups.find(g => g.id == groupId);
      if (!group) return;
      
      // 모바일 사이드바 닫기
      if (window.innerWidth <= 1024) {
        DOM.sidebar.classList.remove("open");
      }
      
      // 삭제 모드 초기화
      deleteMode = false;
      
      // 활동 로깅
      logUserActivity("select_group", { groupId, groupName: group.name });
      
      // 페이지 제목 업데이트
      DOM.pageTitle.textContent = group.name;
      
      // 그룹 콘텐츠 렌더링
      renderContentForGroup(group);
    }
    
    /****************************************
     13) 챗봇 콘텐츠 렌더링
    *****************************************/
    // 모든 그룹 콘텐츠 렌더링
    function renderAllGroupsContent() {
      // DOM 요소 가져오기
      const contentArea = DOM.contentArea;
      
      // 로딩 상태 표시
      contentArea.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full inline-block animate-spin"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-300">챗봇을 불러오는 중...</p>
          </div>
        </div>
      `;
      
      // 지연 시간 추가 (UI 개선)
      setTimeout(() => {
        contentArea.innerHTML = "";
        
        // 챗봇이 없는 경우
        if (!chatbotGroups.length) {
          contentArea.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <div class="mb-4">
                <i class="fas fa-robot text-4xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">챗봇이 없습니다</h3>
              <p class="text-gray-500 dark:text-gray-400">등록된 챗봇이 없습니다. 새 챗봇을 추가하세요.</p>
              ${checkPermission("관리자", false) ? `
                <button onclick="addChatbot()" class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <i class="fas fa-plus mr-2"></i> 챗봇 추가
                </button>
              ` : ''}
            </div>
          `;
          return;
        }
        
        // 모든 그룹의 챗봇 수집
        let allChatbots = [];
        
        chatbotGroups.forEach(group => {
          if (group.chatbots && group.chatbots.length > 0) {
            // 활성 세션에 따라 필터링
            const filtered = activeSession === "all" 
              ? group.chatbots 
              : group.chatbots.filter(bot => bot.session === activeSession);
            
            // 그룹 정보 추가
            filtered.forEach(bot => {
              allChatbots.push({
                ...bot,
                groupId: group.id,
                groupName: group.name
              });
            });
          }
        });
        
        // 챗봇이 없는 경우
        if (allChatbots.length === 0) {
          contentArea.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <div class="mb-4">
                <i class="fas fa-filter text-4xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                ${activeSession === "all" ? "챗봇이 없습니다" : `"${DOM.currentSessionName.textContent}" 세션에 챗봇이 없습니다`}
              </h3>
              <p class="text-gray-500 dark:text-gray-400">선택한 조건에 맞는 챗봇이 없습니다.</p>
            </div>
          `;
          return;
        }
        
        // 콘텐츠 섹션 생성
        const section = document.createElement("div");
        section.className = "bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden";
        
        // 섹션 헤더 생성
        section.innerHTML = `
          <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center">
              <i class="fas fa-th-large mr-3 text-blue-500 dark:text-blue-400"></i>
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                ${activeSession === "all" ? "전체 챗봇" : `${DOM.currentSessionName.textContent} 챗봇`}
              </h3>
            </div>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              ${allChatbots.length}개의 챗봇이 있습니다
            </p>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              ${renderChatbotCards(allChatbots, true)}
            </div>
          </div>
        `;
        
        // 컨테이너에 섹션 추가
        contentArea.appendChild(section);
      }, 300);
    }
    
    // 단일 그룹 콘텐츠 렌더링
    function renderContentForGroup(group) {
      // DOM 요소 가져오기
      const contentArea = DOM.contentArea;
      
      // 로딩 상태 표시
      contentArea.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full inline-block animate-spin"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-300">챗봇을 불러오는 중...</p>
          </div>
        </div>
      `;
      
      // 지연 시간 추가 (UI 개선)
      setTimeout(() => {
        contentArea.innerHTML = "";
        
        // 활성 세션에 따라 챗봇 필터링
        if (group.chatbots && group.chatbots.length > 0) {
          const filteredBots = activeSession === "all" 
            ? group.chatbots 
            : group.chatbots.filter(bot => bot.session === activeSession);
          
          if (filteredBots.length > 0) {
            renderChatbotSection(contentArea, filteredBots, group);
          } else {
            // 선택된 세션에 챗봇이 없는 경우
            contentArea.innerHTML = `
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                <div class="mb-4">
                  <i class="fas fa-tag text-4xl text-gray-400 dark:text-gray-500"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  "${DOM.currentSessionName.textContent}" 세션에 챗봇이 없습니다
                </h3>
                <p class="text-gray-500 dark:text-gray-400">이 세션에 등록된 챗봇이 없습니다. 새 챗봇을 추가하세요.</p>
                ${checkPermission("관리자", false) ? `
                  <button onclick="addChatbot()" class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <i class="fas fa-plus mr-2"></i> 챗봇 추가
                  </button>
                ` : ''}
              </div>
            `;
          }
        } else {
          // 챗봇이 없는 경우
          contentArea.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <div class="mb-4">
                <i class="fas fa-robot text-4xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">챗봇이 없습니다</h3>
              <p class="text-gray-500 dark:text-gray-400">현재 선택하신 그룹에 챗봇이 없습니다. 새 챗봇을 추가하세요.</p>
              ${checkPermission("관리자", false) ? `
                <button onclick="addChatbot()" class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <i class="fas fa-plus mr-2"></i> 챗봇 추가
                </button>
              ` : ''}
            </div>
          `;
        }
      }, 300);
    }
    
    // 챗봇 섹션 렌더링
    function renderChatbotSection(container, chatbots, group) {
      // 세션 제목 설정
      let headerTitle = "";
      let headerIcon = "";
      
      if (activeSession === "all") {
        headerTitle = "전체 챗봇";
        headerIcon = "fa-robot";
      } else {
        const session = groupSessions[group.id]?.find(s => s.id === activeSession);
        headerTitle = session ? session.title : "커스텀 챗봇";
        headerIcon = sessionInfo[activeSession]?.icon || "fa-tag";
      }
      
      // 섹션 컨테이너 생성
      const section = document.createElement("div");
      section.className = "bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden";
      
      // 섹션 헤더 생성
      section.innerHTML = `
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center">
            <i class="fas ${headerIcon} mr-3 text-blue-500 dark:text-blue-400"></i>
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">${headerTitle}</h3>
          </div>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            ${chatbots.length}개의 챗봇이 있습니다
          </p>
        </div>
        <div class="px-4 py-5 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            ${renderChatbotCards(chatbots)}
          </div>
        </div>
      `;
      
      // 컨테이너에 섹션 추가
      container.appendChild(section);
    }
    
    // 챗봇 카드 렌더링
    function renderChatbotCards(bots, showGroup = false) {
      return bots
        .map(bot => {
          // 챗봇 아이콘 설정
          const icon = getIconForBot(bot.name);
          
          // 세션 이름 찾기
          let sessionName = "기본";
          
          if (bot.groupId && showGroup) {
            // 전체 보기에서는 그룹 이름 표시
            sessionName = bot.groupName || "기본 그룹";
          } else if (selectedGroupId !== "all") {
            // 그룹 선택 시 세션 이름 표시
            const session = groupSessions[selectedGroupId]?.find(s => s.id === bot.session);
            sessionName = session ? session.title : sessionName;
          }
          
          // 카드 생성
          return `
            <div class="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out ${deleteMode ? 'ring-2 ring-red-200 dark:ring-red-900' : ''}" data-name="${bot.name.toLowerCase()}">
              <div class="p-5">
                <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900">
                  <i class="${icon} text-blue-500 dark:text-blue-400 text-xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white text-center mb-1">${bot.name}</h3>
                <div class="flex justify-center mb-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    ${sessionName}
                  </span>
                </div>
                <div class="flex justify-center">
                  ${deleteMode ? 
                    `<div class="flex items-center justify-center mt-2">
                      <input type="checkbox" data-id="${bot.id}" class="delete-checkbox w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600">
                      <label class="ml-2 text-sm text-gray-700 dark:text-gray-300">삭제</label>
                    </div>` : 
                    `<button onclick="openChatbot('${bot.url}', '${bot.id}', '${bot.name}')" class="inline-flex items-center py-2 px-4 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                      <i class="fas fa-external-link-alt mr-2"></i> 열기
                    </button>`
                  }
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
    
    // 챗봇 실행
    function openChatbot(url, botId, botName) {
      // 챗봇 사용 로깅
      logBotUsage(botId, botName, 'custom');
      
      // 챗봇 URL 열기
      window.open(url, '_blank');
    }
    
    // 챗봇 사용 로깅
    function logBotUsage(botId, botName, botType = "standard") {
      if (!currentUid) return;
      
      // 사용 시간
      const timestamp = new Date().toISOString();
      
      // 로그 객체 생성
      const usageLog = {
        userId: currentUid,
        email: currentUser.email,
        displayName: currentUser ? (currentUser.displayName || currentUser.email.split("@")[0]) : "Unknown User",
        botId: botId,
        botName: botName,
        botType: botType,
        groupId: selectedGroupId,
        sessionId: activeSession,
        timestamp: timestamp
      };
      
      // Firebase에 로그 저장
      db.ref("botUsageLogs")
        .push(usageLog)
        .catch(err => { console.error("챗봇 사용 로깅 실패:", err); });
    }
    
    // 챗봇 아이콘 결정 함수
    function getIconForBot(botName) {
      const lower = botName.toLowerCase();
      
      if (lower.includes("이메일") || lower.includes("메일") || lower.includes("회신"))
        return "fas fa-envelope";
      else if (lower.includes("erp") || lower.includes("접수"))
        return "fas fa-database";
      else if (lower.includes("도우미") || lower.includes("as"))
        return "fas fa-hands-helping";
      else if (lower.includes("번역"))
        return "fas fa-language";
      else if (lower.includes("비즈니스"))
        return "fas fa-briefcase";
      else if (lower.includes("정보") || lower.includes("검색"))
        return "fas fa-info-circle";
      else if (lower.includes("영상"))
        return "fas fa-film";
      else if (lower.includes("보고서") || lower.includes("문서"))
        return "fas fa-file-alt";
      else if (lower.includes("엑셀"))
        return "fas fa-file-excel";
      else if (lower.includes("분석"))
        return "fas fa-chart-line";
      else if (lower.includes("기술"))
        return "fas fa-tools";
      else if (lower.includes("pro") || lower.includes("master"))
        return "fas fa-award";
      else
        return "fas fa-robot";
    }
    
    /****************************************
     14) 그룹 관리 함수
    *****************************************/
    // 그룹 추가
    function addGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 그룹 이름 입력 요청
      const groupName = prompt("새 그룹 이름을 입력하세요:");
      if (!groupName) return;
      
      // 그룹 유형 선택
      const types = [
        { id: "custom", name: "일반 그룹" },
        { id: "customerSupport", name: "고객지원" },
        { id: "aiTool", name: "AI 도구" },
        { id: "knowledge", name: "지식 베이스" },
        { id: "business", name: "비즈니스" }
      ];
      
      let typeOptions = "그룹 유형을 선택하세요 (1-5):\n";
      types.forEach((type, index) => {
        typeOptions += `${index + 1}. ${type.name}\n`;
      });
      
      const typeChoice = prompt(typeOptions);
      if (!typeChoice) return;
      
      const typeIndex = parseInt(typeChoice) - 1;
      if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= types.length) {
        showToast("유효한 그룹 유형을 선택하세요.", true);
        return;
      }
      
      // 새 그룹 생성
      const newGroupId = Date.now();
      
      const newGroup = {
        id: newGroupId,
        name: groupName,
        type: types[typeIndex].id,
        chatbots: [],
        createdBy: currentUid,
        createdAt: new Date().toISOString()
      };
      
      // 그룹 세션 초기화
      groupSessions[newGroupId] = defaultSessions.slice();
      
      // 그룹 목록에 추가
      chatbotGroups.push(newGroup);
      
      // 그룹과 세션 정보 저장
      Promise.all([
        // 그룹 정보 저장
        db.ref(`chatbotGroups/${chatbotGroups.length - 1}`).set(newGroup),
        // 그룹 세션 정보 저장
        db.ref(`groupSessions/${newGroupId}`).set(groupSessions[newGroupId])
      ]).then(() => {
        // UI 업데이트
        renderSidebar();
        
        // 신규 그룹 선택
        selectGroup(newGroupId);
        
        // 활동 로깅
        logUserActivity("add_group", { groupId: newGroupId, groupName: newGroup.name, groupType: newGroup.type });
        
        // 성공 메시지 표시
        showToast(`"${groupName}" 그룹이 추가되었습니다.`);
        
        // 관리자 패널 닫기
        if (isAdminPanelOpen) toggleAdminPanel();
      }).catch(err => {
        console.error("그룹 추가 실패:", err);
        showToast("그룹 추가 실패", true);
      });
    }
    
    // 그룹 수정
    function editGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("수정할 그룹을 선택하세요.", true);
        return;
      }
      
      // 선택된 그룹 찾기
      const groupIndex = chatbotGroups.findIndex(g => g.id == selectedGroupId);
      if (groupIndex === -1) return;
      
      const group = chatbotGroups[groupIndex];
      
      // 새 이름 입력 요청
      const newName = prompt("새로운 그룹 이름을 입력하세요:", group.name);
      if (!newName || newName === group.name) {
        showToast("이름이 변경되지 않았습니다.", true);
        return;
      }
      
      // 그룹 이름 업데이트
      group.name = newName;
      group.updatedAt = new Date().toISOString();
      group.updatedBy = currentUid;
      
      // Firebase에 그룹 정보 저장
      db.ref(`chatbotGroups/${groupIndex}`).set(group)
        .then(() => {
          // UI 업데이트
          renderSidebar();
          
          // 페이지 제목 업데이트
          if (selectedGroupId === group.id) {
            DOM.pageTitle.textContent = newName;
          }
          
          // 활동 로깅
          logUserActivity("edit_group", { groupId: group.id, newName: newName });
          
          // 성공 메시지 표시
          showToast(`그룹 이름이 "${newName}"으로 수정되었습니다.`);
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("그룹 수정 실패:", err);
          showToast("그룹 수정 실패", true);
        });
    }
    
    // 그룹 삭제
    function deleteGroup() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("삭제할 그룹을 먼저 선택하세요.", true);
        return;
      }
      
      // 선택된 그룹 찾기
      const groupIndex = chatbotGroups.findIndex(g => g.id == selectedGroupId);
      if (groupIndex === -1) return;
      
      const group = chatbotGroups[groupIndex];
      
      // 마지막 그룹 삭제 방지
      if (chatbotGroups.length <= 1) {
        showToast("마지막 그룹은 삭제할 수 없습니다.", true);
        return;
      }
      
      // 삭제 확인
      if (!confirm(`"${group.name}" 그룹을 삭제하시겠습니까?`)) return;
      
      // 삭제된 그룹 정보 저장
      const deletedGroupInfo = { ...group };
      
      // 그룹 세션 정보 삭제
      delete groupSessions[selectedGroupId];
      
      // 그룹 목록에서 제거
      chatbotGroups.splice(groupIndex, 1);
      
      // Firebase에서 그룹 및 세션 정보 삭제
      Promise.all([
        // 그룹 정보 전체 업데이트 (인덱스 변경으로 인해)
        db.ref("chatbotGroups").set(chatbotGroups),
        // 그룹 세션 정보 삭제
        db.ref(`groupSessions/${selectedGroupId}`).remove()
      ]).then(() => {
        // UI 업데이트
        renderSidebar();
        
        // 첫 번째 그룹 선택 또는 비어있는 메시지 표시
        if (chatbotGroups.length > 0) {
          selectGroup(chatbotGroups[0].id);
        } else {
          DOM.contentArea.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <div class="mb-4">
                <i class="fas fa-folder-open text-4xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">챗봇 그룹이 없습니다</h3>
              <p class="text-gray-500 dark:text-gray-400">새 그룹을 추가하세요.</p>
              <button onclick="addGroup()" class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <i class="fas fa-plus mr-2"></i> 그룹 추가
              </button>
            </div>
          `;
        }
        
        // 활동 로깅
        logUserActivity("delete_group", { 
          groupId: deletedGroupInfo.id, 
          groupName: deletedGroupInfo.name, 
          chatbotsCount: deletedGroupInfo.chatbots ? deletedGroupInfo.chatbots.length : 0 
        });
        
        // 성공 메시지 표시
        showToast(`"${deletedGroupInfo.name}" 그룹이 삭제되었습니다.`);
        
        // 관리자 패널 닫기
        if (isAdminPanelOpen) toggleAdminPanel();
      }).catch(err => {
        console.error("그룹 삭제 실패:", err);
        showToast("그룹 삭제 실패", true);
      });
    }
    
    /****************************************
     15) 챗봇 관리 함수
    *****************************************/
    // 챗봇 추가
    function addChatbot() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("먼저 그룹을 선택하세요.", true);
        return;
      }
      
      // 선택된 그룹 찾기
      const groupIndex = chatbotGroups.findIndex(g => g.id == selectedGroupId);
      if (groupIndex === -1) return;
      
      const group = chatbotGroups[groupIndex];
      
      // 챗봇 이름 입력 요청
      const botName = prompt("추가할 챗봇 이름을 입력하세요:");
      if (!botName) return;
      
      // 챗봇 URL 입력 요청
      const botUrl = prompt("챗봇 URL을 입력하세요:");
      if (!botUrl) return;
      
      // 세션 선택: 현재 그룹의 세션 목록
      const availableSessions = groupSessions[selectedGroupId] || defaultSessions;
      
      // "전체" 제외한 세션만 표시
      const selectableSessions = availableSessions.filter(s => s.id !== "all");
      
      // 세션 목록 문자열 생성
      let sessionListStr = "아래 번호 중 하나를 선택하세요:\n";
      selectableSessions.forEach((s, index) => {
        sessionListStr += `${index + 1}. ${s.title}\n`;
      });
      sessionListStr += `${selectableSessions.length + 1}. 전체`;
      
      // 세션 선택 입력 요청
      const sessionChoice = prompt("챗봇이 포함될 세션 번호를 입력하세요:\n" + sessionListStr);
      const choiceNum = parseInt(sessionChoice);
      
      // 입력 유효성 검사
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > selectableSessions.length + 1) {
        showToast("유효한 세션을 선택하지 않았습니다.", true);
        return;
      }
      
      // 선택된 세션 ID (마지막 선택은 "전체")
      const sessionId = choiceNum <= selectableSessions.length 
        ? selectableSessions[choiceNum - 1].id
        : "all";
      
      // 챗봇 배열 초기화 (필요 시)
      if (!group.chatbots) group.chatbots = [];
      
      // 새 챗봇 생성
      const newBot = {
        id: Date.now(),
        name: botName,
        url: botUrl,
        custom: true,
        session: sessionId,
        createdBy: currentUid,
        createdAt: new Date().toISOString()
      };
      
      // 챗봇 목록에 추가
      group.chatbots.push(newBot);
      
      // Firebase에 그룹 정보 저장
      db.ref(`chatbotGroups/${groupIndex}`).set(group)
        .then(() => {
          // UI 업데이트
          if (activeSession === "all" || activeSession === sessionId) {
            renderContentForGroup(group);
          }
          
          // 활동 로깅
          logUserActivity("add_chatbot", { 
            groupId: group.id, 
            groupName: group.name, 
            botId: newBot.id, 
            botName: newBot.name,
            sessionId: sessionId
          });
          
          // 성공 메시지 표시
          showToast(`"${botName}" 챗봇이 추가되었습니다.`);
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("챗봇 추가 실패:", err);
          showToast("챗봇 추가 실패", true);
        });
    }
    
    // 챗봇 수정
    function editChatbot() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("먼저 그룹을 선택하세요.", true);
        return;
      }
      
      // 선택된 그룹 찾기
      const groupIndex = chatbotGroups.findIndex(g => g.id == selectedGroupId);
      if (groupIndex === -1) return;
      
      const group = chatbotGroups[groupIndex];
      
      // 커스텀 챗봇 필터링
      const customBots = group.chatbots ? group.chatbots.filter(bot => typeof bot === "object" && bot.custom) : [];
      
      if (customBots.length === 0) {
        showToast("수정할 챗봇이 없습니다.", true);
        return;
      }
      
      // 챗봇 목록 문자열 생성
      let listStr = "수정할 챗봇 번호를 선택하세요:\n";
      customBots.forEach((bot, index) => { 
        listStr += `${index + 1}. ${bot.name}\n`; 
      });
      
      // 수정할 챗봇 선택 입력 요청
      const choice = prompt(listStr);
      const choiceNum = parseInt(choice);
      
      // 입력 유효성 검사
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > customBots.length) {
        showToast("유효한 번호를 선택하지 않았습니다.", true);
        return;
      }
      
      // 선택된 챗봇
      const botToEdit = customBots[choiceNum - 1];
      
      // 챗봇 정보 수정
      const newName = prompt("새로운 챗봇 이름을 입력하세요:", botToEdit.name);
      if (!newName) return;
      
      const newUrl = prompt("새로운 챗봇 URL을 입력하세요:", botToEdit.url);
      if (!newUrl) return;
      
      // 세션 변경 여부 확인
      const changeSession = confirm("세션을 변경하시겠습니까?");
      let newSession = botToEdit.session;
      
      if (changeSession) {
        // 현재 그룹의 세션 목록
        const availableSessions = groupSessions[selectedGroupId] || defaultSessions;
        
        // "전체" 제외한 세션만 표시
        const selectableSessions = availableSessions.filter(s => s.id !== "all");
        
        // 세션 목록 문자열 생성
        let sessionListStr = "새로운 세션 번호를 선택하세요:\n";
        selectableSessions.forEach((s, index) => {
          const isCurrent = s.id === botToEdit.session;
          sessionListStr += `${index + 1}. ${s.title}${isCurrent ? ' (현재)' : ''}\n`;
        });
        sessionListStr += `${selectableSessions.length + 1}. 전체${botToEdit.session === "all" ? ' (현재)' : ''}`;
        
        // 세션 선택 입력 요청
        const sessionChoice = prompt(sessionListStr);
        const sessionNum = parseInt(sessionChoice);
        
        // 입력 유효성 검사
        if (!isNaN(sessionNum) && sessionNum >= 1 && sessionNum <= selectableSessions.length + 1) {
          newSession = sessionNum <= selectableSessions.length 
            ? selectableSessions[sessionNum - 1].id
            : "all";
        }
      }
      
      // 챗봇 정보 업데이트
      const botIndex = group.chatbots.findIndex(b => b.id === botToEdit.id);
      if (botIndex !== -1) {
        group.chatbots[botIndex].name = newName;
        group.chatbots[botIndex].url = newUrl;
        group.chatbots[botIndex].session = newSession;
        group.chatbots[botIndex].updatedAt = new Date().toISOString();
        group.chatbots[botIndex].updatedBy = currentUid;
      }
      
      // Firebase에 그룹 정보 저장
      db.ref(`chatbotGroups/${groupIndex}`).set(group)
        .then(() => {
          // UI 업데이트
          if (activeSession === "all" || activeSession === newSession || activeSession === botToEdit.session) {
            renderContentForGroup(group);
          }
          
          // 활동 로깅
          logUserActivity("edit_chatbot", { 
            groupId: group.id,
            botId: botToEdit.id, 
            oldName: botToEdit.name,
            newName: newName, 
            newUrl: newUrl,
            newSession: newSession
          });
          
          // 성공 메시지 표시
          showToast(`챗봇이 수정되었습니다.`);
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(err => {
          console.error("챗봇 수정 실패:", err);
          showToast("챗봇 수정 실패", true);
        });
    }
    
    // 챗봇 삭제 모드 토글/삭제 실행
    function deleteChatbot() {
      // 권한 확인
      if (!checkPermission("관리자")) return;
      
      // 선택된 그룹 확인
      if (!selectedGroupId || selectedGroupId === "all") {
        showToast("먼저 그룹을 선택하세요.", true);
        return;
      }
      
      // 선택된 그룹 찾기
      const groupIndex = chatbotGroups.findIndex(g => g.id == selectedGroupId);
      if (groupIndex === -1) return;
      
      const group = chatbotGroups[groupIndex];
      
      // 삭제할 챗봇 존재 여부 확인
      if (!group.chatbots || group.chatbots.length === 0) {
        showToast("이 그룹에는 삭제할 챗봇이 없습니다.", true);
        return;
      }
      
      // 삭제 모드 토글
      if (!deleteMode) {
        // 삭제 모드 활성화
        deleteMode = true;
        
        // UI 업데이트
        renderContentForGroup(group);
        
        // 버튼 텍스트 변경 (관리자 패널 내부)
        DOM.deleteChatbotAdminBtn.innerHTML = `<i class="fas fa-check"></i><span>삭제 확인</span>`;
        
        // 안내 메시지
        showToast("삭제할 챗봇을 선택한 후, 삭제 버튼을 다시 클릭하세요.");
      } else {
        // 체크된 챗봇 확인
        const checkboxes = document.querySelectorAll(".delete-checkbox:checked");
        if (checkboxes.length === 0) {
          showToast("삭제할 챗봇을 선택하세요.", true);
          return;
        }
        
        // 삭제 확인
        if (!confirm(`선택한 ${checkboxes.length}개의 챗봇을 삭제하시겠습니까?`)) return;
        
        // 삭제할 챗봇 ID 목록
        const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute("data-id")));
        
        // 삭제된 챗봇 정보 저장
        const deletedBots = group.chatbots.filter(bot => idsToDelete.includes(bot.id));
        
        // 그룹에서 챗봇 제거
        group.chatbots = group.chatbots.filter(bot => !idsToDelete.includes(bot.id));
        
        // Firebase에 그룹 정보 저장
        db.ref(`chatbotGroups/${groupIndex}`).set(group)
          .then(() => {
            // 삭제 모드 비활성화
            deleteMode = false;
            
            // 버튼 텍스트 복원 (관리자 패널 내부)
            DOM.deleteChatbotAdminBtn.innerHTML = `<i class="fas fa-trash"></i><span>챗봇 삭제</span>`;
            
            // UI 업데이트
            renderContentForGroup(group);
            
            // 활동 로깅
            logUserActivity("delete_chatbots", {
              groupId: group.id,
              groupName: group.name,
              deletedBotsCount: deletedBots.length,
              deletedBots: deletedBots.map(bot => ({ id: bot.id, name: bot.name }))
            });
            
            // 성공 메시지 표시
            showToast(`${deletedBots.length}개 챗봇이 삭제되었습니다.`);
            
            // 관리자 패널 닫기
            if (isAdminPanelOpen) toggleAdminPanel();
          })
          .catch(err => {
            console.error("챗봇 삭제 실패:", err);
            showToast("챗봇 삭제 실패", true);
          });
      }
    }
    
    /****************************************
     16) 데이터 저장 함수
    *****************************************/
    function saveData() {
      // 로그인 상태 확인
      if (!currentUser) {
        showToast("로그인이 필요합니다.", true);
        return;
      }
      
      // 권한에 따른 확인 메시지 표시
      if (userRole !== "관리자" && userRole !== "슈퍼관리자") {
        if (!confirm("변경 내용을 저장하시겠습니까?\n(관리자 승인이 필요할 수 있습니다)"))
          return;
      }
      
      // 저장할 데이터 준비
      const updatedGroups = chatbotGroups.map(group => ({
        ...group,
        lastModifiedBy: currentUid,
        lastModifiedAt: new Date().toISOString()
      }));
      
      // Firebase에 데이터 저장
      const savePromises = [
        db.ref("chatbotGroups").set(updatedGroups),
        db.ref("groupSessions").set(groupSessions)
      ];
      
      // 모든 데이터 저장 시도
      Promise.all(savePromises)
        .then(() => {
          // 성공 메시지 표시
          showToast("데이터가 성공적으로 저장되었습니다.");
          
          // 활동 로깅
          logUserActivity("save_data", { timestamp: new Date().toISOString() });
          
          // 관리자 패널 닫기
          if (isAdminPanelOpen) toggleAdminPanel();
        })
        .catch(error => {
          console.error("저장 실패:", error);
          showToast("데이터 저장에 실패했습니다: " + error.message, true);
        });
    }
    
    /****************************************
     17) 챗봇 검색 함수
    *****************************************/
    function searchChatbots() {
      // 검색어 가져오기
      const searchTerm = DOM.searchInput.value.toLowerCase();
      
      // 검색 결과 없음 메시지 참조
      let noResultsMessage = document.getElementById('no-search-results');
      
      // 모든 챗봇 카드 가져오기
      const allChatbots = document.querySelectorAll("[data-name]");
      let visibleCount = 0;
      
      // 검색어에 따라 카드 표시/숨김 처리
      allChatbots.forEach(card => {
        const name = card.dataset.name || '';
        const isMatch = name.includes(searchTerm);
        
        if (isMatch) {
          card.style.display = "";
          visibleCount++;
          
          // 검색어 하이라이트 (챗봇 이름만)
          if (searchTerm.length > 0) {
            const nameElement = card.querySelector('h3');
            if (nameElement) {
              const name = nameElement.textContent;
              const regex = new RegExp(searchTerm, 'gi');
              nameElement.innerHTML = name.replace(regex, match => `<mark class="bg-yellow-200 dark:bg-yellow-700 px-1 rounded">${match}</mark>`);
            }
          }
        } else {
          card.style.display = "none";
        }
      });
      
      // 검색 결과 없음 처리
      if (visibleCount === 0 && searchTerm.length > 0) {
        if (!noResultsMessage) {
          noResultsMessage = document.createElement('div');
          noResultsMessage.id = 'no-search-results';
          noResultsMessage.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center mt-4';
          noResultsMessage.innerHTML = `
            <div class="mb-4">
              <i class="fas fa-search text-4xl text-gray-400 dark:text-gray-500"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">검색 결과 없음</h3>
            <p class="text-gray-500 dark:text-gray-400">"${searchTerm}"에 대한 검색 결과가 없습니다.</p>
          `;
          DOM.contentArea.appendChild(noResultsMessage);
        }
      } else if (noResultsMessage) {
        noResultsMessage.remove();
      }
      
      // 검색어가 2글자 이상일 때 로그 기록
      if (searchTerm.length > 1) {
        logUserActivity("search_chatbots", { searchTerm });
      }
    }
    
    /****************************************
     18) 하위 그룹(서브그룹) 관련 함수
    *****************************************/
    let subgroups = {};
    
    // 하위 그룹 로드
    function loadSubgroups() {
      if (!currentUid) return;
      
      db.ref(`subgroups/${currentUid}`)
        .once("value")
        .then(snap => {
          if (snap.exists()) {
            subgroups = snap.val();
          } else {
            // 로컬 스토리지에서 확인
            const localData = localStorage.getItem("snsys_subgroups");
            if (localData) {
              try {
                subgroups = JSON.parse(localData);
              } catch (e) {
                console.error("로컬 스토리지 서브그룹 파싱 오류:", e);
                subgroups = {};
              }
            }
          }
        })
        .catch(err => {
          console.error("하위 그룹 로드 실패:", err);
          
          // 로컬 스토리지 폴백
          const localData = localStorage.getItem("snsys_subgroups");
          if (localData) {
            try {
              subgroups = JSON.parse(localData);
            } catch (e) {
              console.error("로컬 스토리지 서브그룹 파싱 오류:", e);
              subgroups = {};
            }
          }
        });
    }
    
    // 하위 그룹 저장
    function saveSubgroups() {
      if (!currentUid) return;
      
      db.ref(`subgroups/${currentUid}`)
        .set(subgroups)
        .then(() => {
          // 로컬 스토리지 백업
          localStorage.setItem("snsys_subgroups", JSON.stringify(subgroups));
        })
        .catch(err => { 
          console.error("하위 그룹 저장 실패:", err); 
          
          // 오류 시 로컬 스토리지에만 저장
          localStorage.setItem("snsys_subgroups", JSON.stringify(subgroups));
        });
    }
    
    /****************************************
     19) 엑셀 관련 함수
    *****************************************/
    // 엑셀 템플릿 다운로드
function downloadExcelTemplate() {
  // 새 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 그룹 시트 생성 (그룹명만)
  const groupsData = [
    ["그룹명"],
    // 예제 데이터
    ["그룹 예시"]
  ];
  const groupsSheet = XLSX.utils.aoa_to_sheet(groupsData);
  XLSX.utils.book_append_sheet(wb, groupsSheet, "그룹");
  
  // 세션 시트 생성 (그룹명, 세션명)
  const sessionsData = [
    ["그룹명", "세션명"],
    // 예제 데이터: "전체" 세션과 추가 세션 예시
    ["그룹 예시", "전체"],
    ["그룹 예시", "세션 예시"]
  ];
  const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsData);
  XLSX.utils.book_append_sheet(wb, sessionsSheet, "세션");
  
  // 챗봇 시트 생성 (그룹명, 세션명, 챗봇명, URL, 챗봇 설명)
  const chatbotsData = [
    ["그룹명", "세션명", "챗봇명", "URL", "챗봇 설명"],
    // 예제 데이터
    ["그룹 예시", "세션 예시", "챗봇 예시", "https://example.com", "예시 챗봇 설명"]
  ];
  const chatbotsSheet = XLSX.utils.aoa_to_sheet(chatbotsData);
  XLSX.utils.book_append_sheet(wb, chatbotsSheet, "챗봇");
  
  // 템플릿 파일 다운로드
  XLSX.writeFile(wb, "챗봇_템플릿.xlsx");
}

    
// 엑셀 업로드 모달 표시 함수 수정
function showUploadExcelModal() {
  // 권한 확인
  if (!checkPermission("관리자")) return;
  
  // 모달 초기화
  DOM.excelFileInput.value = "";
  DOM.excelFilename.textContent = "선택된 파일 없음";
  
  // 글로벌 변수 초기화
  window.excelGroupsData = null;
  window.excelSessionsData = null;
  window.excelChatbotsData = null;
  
  // 모달 표시
  DOM.excelUploadModal.style.display = "flex";
  
  // 관리자 패널 닫기
  if (isAdminPanelOpen) toggleAdminPanel();
}
    
    // 엑셀 업로드 모달 닫기
    function closeExcelUploadModal() {
      DOM.excelUploadModal.style.display = "none";
    }
    
    // 엑셀 데이터 업로드 처리
// 시트를 파싱하여 객체 배열로 반환하는 헬퍼 함수
function parseSheet(sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (data.length === 0) return [];
  const headers = data[0].map(h => h.toString().trim());
  const result = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  return result;
}


// 엑셀 데이터 업로드 처리 함수 수정
function uploadExcelData() {
  const fileInput = DOM.excelFileInput;
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("파일을 선택하세요.", true);
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const requiredSheets = ["그룹", "세션", "챗봇"];
      for (const sheetName of requiredSheets) {
        if (!workbook.SheetNames.includes(sheetName)) {
          showToast(`필수 시트 "${sheetName}"가 없습니다. 템플릿을 확인하세요.`, true);
          return;
        }
      }
      
      // 각 시트를 객체 배열로 파싱
      const groupsSheet = workbook.Sheets["그룹"];
      const sessionsSheet = workbook.Sheets["세션"];
      const chatbotsSheet = workbook.Sheets["챗봇"];
      
      // 전역 변수에 데이터 저장
      window.excelGroupsData = parseSheet(groupsSheet);
      window.excelSessionsData = parseSheet(sessionsSheet);
      window.excelChatbotsData = parseSheet(chatbotsSheet);
      
      console.log("파싱된 그룹 데이터:", window.excelGroupsData);
      console.log("파싱된 세션 데이터:", window.excelSessionsData);
      console.log("파싱된 챗봇 데이터:", window.excelChatbotsData);
      
      if (!window.excelGroupsData || window.excelGroupsData.length === 0) {
        showToast("엑셀 파일에서 그룹 데이터를 찾을 수 없습니다.", true);
        return;
      }
      
      showToast("파일 파싱이 완료되었습니다. 아래 버튼 중 하나를 선택하세요.");
      
    } catch (err) {
      console.error("엑셀 파일 처리 오류:", err);
      showToast("엑셀 파일 처리 중 오류가 발생했습니다.", true);
    }
  };
  
  reader.onerror = function() {
    showToast("파일 읽기 실패", true);
  };
  
  reader.readAsArrayBuffer(file);
}



    
    // 엑셀 데이터 처리 및 업로드
function processExcelData(uploadOption, groupsData, sessionsData, chatbotsData) {
  // 객체의 키를 모두 trim() 처리하는 헬퍼 함수
function trimObjectKeys(data) {
  if (!Array.isArray(data)) {
    console.error("trimObjectKeys: data is not an array.", data);
    return [];
  }
  return data.map(obj => {
    let newObj = {};
    for (const key in obj) {
      newObj[key.trim()] = obj[key];
    }
    return newObj;
  });
}

  
  // 각 데이터 배열의 객체 키 정리
groupsData = trimObjectKeys(groupsData);
sessionsData = trimObjectKeys(sessionsData);
chatbotsData = trimObjectKeys(chatbotsData);

if (!groupsData || groupsData.length === 0) {
  showToast("그룹 데이터가 없습니다.", true);
  return;
}

  
  const newGroups = [];
  const newGroupSessions = {};
  
  // 그룹 시트 처리: "그룹명" 필드 (앞뒤 공백 제거)
  for (const groupRow of groupsData) {
    const groupName = groupRow["그룹명"] ? groupRow["그룹명"].toString().trim() : "";
    if (groupName === "") {
      showToast("그룹 시트에서 '그룹명' 필드가 누락되었거나 공백만 있습니다.", true);
      continue;
    }
    const newGroupId = Date.now() + Math.floor(Math.random() * 1000);
    const group = {
      id: newGroupId,
      name: groupName,
      type: "custom",
      chatbots: [],
      createdAt: new Date().toISOString(),
      createdBy: currentUid,
      importedAt: new Date().toISOString(),
      importedBy: currentUid
    };
    
    const groupSessionList = [];
    // 기본 "전체" 세션 추가
    groupSessionList.push({
      id: "all",
      title: "전체",
      createdAt: new Date().toISOString(),
      createdBy: currentUid
    });
    
    // 세션 시트 처리
    for (const sessionRow of sessionsData) {
      const sessionGroup = sessionRow["그룹명"] ? sessionRow["그룹명"].toString().trim() : "";
      const sessionTitle = sessionRow["세션명"] ? sessionRow["세션명"].toString().trim() : "";
      if (sessionGroup === groupName && sessionTitle !== "") {
        groupSessionList.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          title: sessionTitle,
          createdAt: new Date().toISOString(),
          createdBy: currentUid
        });
      }
    }
    
    // 챗봇 시트 처리
    for (const botRow of chatbotsData) {
      const botGroup = botRow["그룹명"] ? botRow["그룹명"].toString().trim() : "";
      const botName = botRow["챗봇명"] ? botRow["챗봇명"].toString().trim() : "";
      const botUrl = botRow["URL"] ? botRow["URL"].toString().trim() : "";
      if (botGroup === groupName && botName !== "" && botUrl !== "") {
        let sessionId = "all";
        const botSessionRaw = botRow["세션명"] ? botRow["세션명"].toString().trim() : "";
        const sessionFound = groupSessionList.find(s => s.title === botSessionRaw);
        if (sessionFound) {
          sessionId = sessionFound.id;
        }
        const bot = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: botName,
          url: botUrl,
          description: botRow["챗봇 설명"] ? botRow["챗봇 설명"].toString().trim() : "",
          session: sessionId,
          custom: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUid,
          importedAt: new Date().toISOString(),
          importedBy: currentUid
        };
        group.chatbots.push(bot);
      }
    }
    
    newGroups.push(group);
    newGroupSessions[group.id] = groupSessionList;
  }
  
  if (newGroups.length === 0) {
    showToast("처리할 그룹 데이터가 없습니다.", true);
    return;
  }
  
  // 기존 데이터와 분기 처리 (merge: 부분 추가 / replace: 전체 교체)
  if (uploadOption === "merge") {
    const updatedGroups = [...chatbotGroups];
    const updatedGroupSessions = { ...groupSessions };
    for (const newGroup of newGroups) {
      const existingIndex = updatedGroups.findIndex(g => g.name === newGroup.name);
      if (existingIndex !== -1) {
        const existingBotIds = updatedGroups[existingIndex].chatbots.map(b => b.id);
        newGroup.chatbots.forEach(newBot => {
          if (!existingBotIds.includes(newBot.id)) {
            updatedGroups[existingIndex].chatbots.push(newBot);
          }
        });
        if (updatedGroupSessions[updatedGroups[existingIndex].id]) {
          const existingSessionTitles = updatedGroupSessions[updatedGroups[existingIndex].id].map(s => s.title);
          newGroupSessions[newGroup.id].forEach(newSession => {
            if (!existingSessionTitles.includes(newSession.title)) {
              updatedGroupSessions[updatedGroups[existingIndex].id].push(newSession);
            }
          });
        } else {
          updatedGroupSessions[updatedGroups[existingIndex].id] = newGroupSessions[newGroup.id];
        }
      } else {
        updatedGroups.push(newGroup);
        updatedGroupSessions[newGroup.id] = newGroupSessions[newGroup.id];
      }
    }
    Promise.all([
      db.ref("chatbotGroups").set(updatedGroups),
      db.ref("groupSessions").set(updatedGroupSessions)
    ]).then(() => {
      chatbotGroups = updatedGroups;
      groupSessions = updatedGroupSessions;
      logUserActivity("upload_excel_data", { 
        groupsCount: newGroups.length,
        chatbotsCount: newGroups.reduce((count, group) => count + group.chatbots.length, 0),
        uploadOption: "merge"
      });
      renderSidebar();
      if (selectedGroupId === "all") {
        renderAllGroupsContent();
      } else {
        const group = chatbotGroups.find(g => g.id == selectedGroupId);
        if (group) {
          renderContentForGroup(group);
        } else if (chatbotGroups.length > 0) {
          selectGroup(chatbotGroups[0].id);
        }
      }
      closeExcelUploadModal();
      showToast("데이터가 병합되어 업로드되었습니다.");
    }).catch(err => {
      console.error("데이터 업로드 실패:", err);
      showToast("데이터 업로드 실패: " + err.message, true);
    });
    
  } else if (uploadOption === "replace") {
    Promise.all([
      db.ref("chatbotGroups").set(newGroups),
      db.ref("groupSessions").set(newGroupSessions)
    ]).then(() => {
      chatbotGroups = newGroups;
      groupSessions = newGroupSessions;
      logUserActivity("upload_excel_data", { 
        groupsCount: newGroups.length,
        chatbotsCount: newGroups.reduce((count, group) => count + group.chatbots.length, 0),
        uploadOption: "replace"
      });
      renderSidebar();
      if (selectedGroupId === "all") {
        renderAllGroupsContent();
      } else {
        const group = chatbotGroups.find(g => g.id == selectedGroupId);
        if (group) {
          renderContentForGroup(group);
        } else if (chatbotGroups.length > 0) {
          selectGroup(chatbotGroups[0].id);
        }
      }
      closeExcelUploadModal();
      showToast("기존 데이터를 교체하여 업로드하였습니다.");
    }).catch(err => {
      console.error("데이터 업로드 실패:", err);
      showToast("데이터 업로드 실패: " + err.message, true);
    });
  }
}







    
    // 엑셀 내보내기
function exportToExcel() {
  // 권한 확인
  if (!checkPermission("관리자")) return;
  
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 그룹 데이터 시트 생성 (그룹명만)
  const groupsData = [["그룹명"]];
  chatbotGroups.forEach(group => {
    groupsData.push([group.name]);
  });
  const groupsSheet = XLSX.utils.aoa_to_sheet(groupsData);
  XLSX.utils.book_append_sheet(wb, groupsSheet, "그룹");
  
  // 세션 데이터 시트 생성 (그룹명, 세션명)
  const sessionsData = [["그룹명", "세션명"]];
  Object.entries(groupSessions).forEach(([groupId, sessions]) => {
    const group = chatbotGroups.find(g => g.id == groupId);
    const groupName = group ? group.name : "";
    sessions.forEach(session => {
      sessionsData.push([groupName, session.title]);
    });
  });
  const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsData);
  XLSX.utils.book_append_sheet(wb, sessionsSheet, "세션");
  
  // 챗봇 데이터 시트 생성 (그룹명, 세션명, 챗봇명, URL, 챗봇 설명)
  const chatbotsData = [["그룹명", "세션명", "챗봇명", "URL", "챗봇 설명"]];
  chatbotGroups.forEach(group => {
    if (group.chatbots && group.chatbots.length > 0) {
      group.chatbots.forEach(bot => {
        let sessionTitle = "전체";
        const sessions = groupSessions[group.id];
        if (sessions) {
          const found = sessions.find(s => s.id == bot.session);
          if (found) sessionTitle = found.title;
        }
        chatbotsData.push([
          group.name,
          sessionTitle,
          bot.name,
          bot.url,
          bot.description || ""
        ]);
      });
    }
  });
  const chatbotsSheet = XLSX.utils.aoa_to_sheet(chatbotsData);
  XLSX.utils.book_append_sheet(wb, chatbotsSheet, "챗봇");
  
  // 엑셀 파일 다운로드
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  XLSX.writeFile(wb, `챗봇_데이터_${timestamp}.xlsx`);
      
      // 활동 로깅
      logUserActivity("export_excel_data", {
        groupsCount: chatbotGroups.length,
        chatbotsCount: chatbotsData.length - 1
      });
      
      // 토스트 메시지 표시
      showToast("데이터가 엑셀 파일로 내보내기 되었습니다.");
      
      // 관리자 패널 닫기
      if (isAdminPanelOpen) toggleAdminPanel();
    }
    
function downloadUserExcel() {
  firebase.database().ref("users").once("value")
    .then(function(snapshot) {
      const users = [];
      snapshot.forEach(function(childSnapshot) {
        const user = childSnapshot.val();
        users.push({
          "이름": user.displayName || '',
          "이메일": user.email || '',
          "권한": user.role || '',
          "그룹": user.group || ''
        });
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(users);
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(wb, "users.xlsx");
    })
    .catch(function(error) {
      console.error("유저 데이터 다운로드 실패:", error);
      showToast("유저 데이터 다운로드에 실패했습니다.", true);
    });
}

// 사용자 엑셀 업로드 모달 표시 함수
function showUserExcelUploadModal() {
  const modal = document.getElementById("user-excel-upload-modal");
  modal.style.display = "flex";
}

// 사용자 엑셀 업로드 모달 닫기 함수
function closeUserExcelUploadModal() {
  const modal = document.getElementById("user-excel-upload-modal");
  modal.style.display = "none";
}

// 모달의 취소 버튼 이벤트 연결
document.getElementById("user-upload-cancel-btn").addEventListener("click", function(){
  closeUserExcelUploadModal();
  showToast("업로드가 취소되었습니다.", true);
});

// 파일 선택 시 파일 이름 표시
document.getElementById("user-excel-file").addEventListener("change", function() {
  if (this.files.length > 0) {
    document.getElementById("user-excel-filename").textContent = this.files[0].name;
  } else {
    document.getElementById("user-excel-filename").textContent = "선택된 파일 없음";
  }
});

// 업로드 버튼 이벤트 연결
document.getElementById("user-upload-btn").addEventListener("click", function() {
  uploadUserExcel();
});

// 업로드 처리 함수
function uploadUserExcel() {
  const fileInput = document.getElementById("user-excel-file");
  const file = fileInput.files[0];
  if (!file) {
    showToast("업로드할 파일을 선택하세요.", true);
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    // jsonData는 각 행이 객체로 구성되며, 필드 이름은 "이름", "이메일", "권한", "그룹"
    jsonData.forEach(function(item) {
      // 이메일을 기준으로 기존 유저가 있는지 검색
      const query = firebase.database().ref("users").orderByChild("email").equalTo(item["이메일"]);
      query.once("value")
        .then(function(snapshot) {
          if (snapshot.exists()) {
            // 기존 유저가 있으면 업데이트 (이름, 권한, 그룹)
            snapshot.forEach(function(childSnapshot) {
              childSnapshot.ref.update({
                displayName: item["이름"] || "",
                role: item["권한"] || "",
                group: item["그룹"] || ""
              });
            });
          } else {
            // 신규 유저일 경우, 새로 추가 (비밀번호는 따로 설정 필요 시 처리)
            const newUserRef = firebase.database().ref("users").push();
            newUserRef.set({
              displayName: item["이름"] || "",
              email: item["이메일"] || "",
              role: item["권한"] || "",
              group: item["그룹"] || "",
              createdAt: new Date().toISOString()
            });
          }
        })
        .catch(function(error) {
          console.error("Excel 업로드 중 오류:", error);
        });
    });
    
    showToast("사용자 엑셀 업로드가 완료되었습니다.");
    closeUserExcelUploadModal();
    // 변경된 사용자 데이터 반영을 위해 유저 목록 다시 로드
    drawUserListForPopup();
  };
  reader.readAsArrayBuffer(file);
}



    /****************************************
     20) 브라우저 지원 확인
    *****************************************/
    function checkBrowserSupport() {
      // 최소 지원 브라우저 버전
      const minVersions = {
        'Chrome': 60,
        'Firefox': 60,
        'Safari': 12,
        'Edge': 15
      };
      
      // 브라우저 정보 확인
      const browserInfo = getBrowserInfo();
      const browserVersion = parseFloat(browserInfo.version);
      
      // 지원되는 브라우저인지 확인
      if (minVersions[browserInfo.name] && browserVersion < minVersions[browserInfo.name]) {
        // 지원되지 않는 브라우저 경고
        showToast("현재 사용 중인 브라우저는 이 애플리케이션에서 완전히 지원되지 않을 수 있습니다. 최신 브라우저로 업그레이드하세요.", true);
      }
    }
    
    /****************************************
     21) 문서 준비 완료 시 추가 초기화
    *****************************************/
    // 문서 로드 완료 후 실행
    document.addEventListener("DOMContentLoaded", function() {
      console.log("S&SYS AI 챗봇 포털이 초기화되었습니다.");
      
      // 응답형 디자인을 위한 초기 체크
      checkMobileDevice();
      
      // 브라우저 지원 확인
      checkBrowserSupport();
    });
  function showExcelUploadModal() {
    document.getElementById("excel-upload-modal").style.display = "flex";
  }
  function closeExcelUploadModal() {
    document.getElementById("excel-upload-modal").style.display = "none";
  }
  function showUserExcelUploadModal() {
    document.getElementById("user-excel-upload-modal").style.display = "flex";
  }
  function closeUserExcelUploadModal() {
    document.getElementById("user-excel-upload-modal").style.display = "none";
  }