// 登录页面JavaScript

// 全局变量
let loginMode = 'login'; // 'login' 或 'register'

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    // 检查是否已登录
    if (currentUser) {
        window.location.href = '/';
        return;
    }
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化表单验证
    initFormValidation();
}

// 初始化事件监听器
function initEventListeners() {
    // 切换登录/注册模式
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegisterMode();
        });
    }
    
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLoginMode();
        });
    }
    
    // 登录按钮
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // 注册按钮
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
    }
    
    // 表单提交事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegister();
        });
    }
    
    // 忘记密码链接
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPasswordModal();
        });
    }
    
    // 发送验证码按钮
    const sendVerificationBtn = document.getElementById('sendVerificationBtn');
    if (sendVerificationBtn) {
        sendVerificationBtn.addEventListener('click', sendVerificationCode);
    }
}

// 初始化表单验证
function initFormValidation() {
    // 手机号验证
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', () => {
            validatePhone(input);
        });
    });
    
    // 密码验证
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.id === 'confirmPassword') {
                validatePasswordMatch();
            } else {
                validatePassword(input);
            }
        });
    });
}

// 切换到注册模式
function switchToRegisterMode() {
    loginMode = 'register';
    
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'block';
    
    // 更新页面标题
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = '用户注册';
}

// 切换到登录模式
function switchToLoginMode() {
    loginMode = 'login';
    
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (registerSection) registerSection.style.display = 'none';
    
    // 更新页面标题
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = '用户登录';
}

// 处理登录
function handleLogin() {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // 验证
    if (!validateLoginForm(phone, password)) {
        return;
    }
    
    // 显示加载状态
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = '登录中...';
    loginBtn.disabled = true;
    
    // 发送登录请求
    fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            phone,
            password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 保存用户信息
            const userData = {
                id: data.user.id,
                name: data.user.name,
                phone: data.user.phone,
                email: data.user.email,
                avatar: data.user.avatar,
                token: data.token
            };
            
            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
            }
            
            // 跳转到首页
            window.location.href = '/';
        } else {
            alert('登录失败: ' + (data.message || '用户名或密码错误'));
        }
    })
    .catch(error => {
        console.error('登录失败:', error);
        alert('登录失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    });
}

// 处理注册
function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const verificationCode = document.getElementById('verificationCode').value.trim();
    const agreement = document.getElementById('agreement').checked;
    
    // 验证
    if (!validateRegisterForm(name, phone, password, confirmPassword, verificationCode, agreement)) {
        return;
    }
    
    // 显示加载状态
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.textContent;
    registerBtn.textContent = '注册中...';
    registerBtn.disabled = true;
    
    // 发送注册请求
    fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            phone,
            password,
            verification_code: verificationCode
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('注册成功，请登录');
            
            // 切换到登录模式
            switchToLoginMode();
            
            // 预填手机号
            document.getElementById('loginPhone').value = phone;
        } else {
            alert('注册失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('注册失败:', error);
        alert('注册失败，请稍后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        registerBtn.textContent = originalText;
        registerBtn.disabled = false;
    });
}

// 发送验证码
function sendVerificationCode() {
    const phone = document.getElementById('registerPhone').value.trim();
    
    // 验证手机号
    if (!validatePhoneValue(phone)) {
        alert('请输入有效的手机号码');
        return;
    }
    
    const sendBtn = document.getElementById('sendVerificationBtn');
    const originalText = sendBtn.textContent;
    
    // 显示加载状态
    sendBtn.textContent = '发送中...';
    sendBtn.disabled = true;
    
    // 发送验证码请求
    fetch(`${API_BASE_URL}/auth/send-verification-code/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            phone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('验证码已发送');
            
            // 开始倒计时
            startCountdown(sendBtn, 60);
        } else {
            alert('发送失败: ' + (data.message || '未知错误'));
            
            // 恢复按钮状态
            sendBtn.textContent = originalText;
            sendBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('发送验证码失败:', error);
        alert('发送失败，请稍后重试');
        
        // 恢复按钮状态
        sendBtn.textContent = originalText;
        sendBtn.disabled = false;
    });
}

// 开始倒计时
function startCountdown(button, seconds) {
    let remainingSeconds = seconds;
    
    const timer = setInterval(() => {
        button.textContent = `${remainingSeconds}秒后重试`;
        button.disabled = true;
        
        remainingSeconds--;
        
        if (remainingSeconds < 0) {
            clearInterval(timer);
            button.textContent = '获取验证码';
            button.disabled = false;
        }
    }, 1000);
}

// 显示忘记密码模态框
function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 验证登录表单
function validateLoginForm(phone, password) {
    if (!phone) {
        alert('请输入手机号');
        return false;
    }
    
    if (!validatePhoneValue(phone)) {
        alert('请输入有效的手机号');
        return false;
    }
    
    if (!password) {
        alert('请输入密码');
        return false;
    }
    
    return true;
}

// 验证注册表单
function validateRegisterForm(name, phone, password, confirmPassword, verificationCode, agreement) {
    if (!name) {
        alert('请输入姓名');
        return false;
    }
    
    if (!phone) {
        alert('请输入手机号');
        return false;
    }
    
    if (!validatePhoneValue(phone)) {
        alert('请输入有效的手机号');
        return false;
    }
    
    if (!password) {
        alert('请输入密码');
        return false;
    }
    
    if (password.length < 6) {
        alert('密码长度不能少于6位');
        return false;
    }
    
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return false;
    }
    
    if (!verificationCode) {
        alert('请输入验证码');
        return false;
    }
    
    if (!agreement) {
        alert('请同意用户协议和隐私政策');
        return false;
    }
    
    return true;
}

// 验证手机号
function validatePhone(input) {
    const phone = input.value.trim();
    const isValid = validatePhoneValue(phone);
    
    if (phone && !isValid) {
        input.classList.add('error');
    } else {
        input.classList.remove('error');
    }
    
    return isValid;
}

// 验证手机号值
function validatePhoneValue(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

// 验证密码
function validatePassword(input) {
    const password = input.value;
    
    if (password && password.length < 6) {
        input.classList.add('error');
    } else {
        input.classList.remove('error');
    }
    
    return password.length >= 6;
}

// 验证密码匹配
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.classList.add('error');
    } else {
        confirmInput.classList.remove('error');
    }
    
    return password === confirmPassword;
}