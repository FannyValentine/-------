// profile.js
import { supabase } from './supabase.js';
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    checkCurrentUser,
    getCurrentUser,
    resetPassword
} from './auth.js';

// ========== СОСТОЯНИЕ ==========
let currentUser = null;
let profileData = null;

// ========== КОРЗИНА ==========
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartDropdown();
}

function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function showToast(title, message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-shopping-cart'}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    
    setTimeout(() => {
        if (toast && toast.remove) toast.remove();
    }, 3000);
}

function addToCart(book, type, price) {
    const existingItem = cart.find(item => item.id === book.id && item.type === type);
    
    if (existingItem) {
        existingItem.quantity++;
        showToast('Корзина обновлена', `${book.title} добавлено еще раз`, 'success');
    } else {
        cart.push({
            id: book.id,
            title: book.title,
            author: book.author,
            cover_image: book.cover_image,
            type: type,
            price: price,
            quantity: 1
        });
        showToast('Добавлено в корзину', `${book.title} - ${type === 'rent' ? 'Аренда' : 'Покупка'} за ${price} ₽`, 'success');
    }
    
    saveCart();
}

function removeFromCart(itemId, type) {
    cart = cart.filter(item => !(item.id === itemId && item.type === type));
    saveCart();
    showToast('Удалено из корзины', 'Товар удален из корзины', 'success');
}

function renderCartDropdown() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Корзина пуста</p>
                <small>Добавьте книги из каталога</small>
            </div>
        `;
        if (cartTotalSpan) cartTotalSpan.textContent = '0 ₽';
        return;
    }
    
    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const typeText = item.type === 'rent' ? 'Аренда' : 'Покупка';
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.cover_image || 'https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖'}" 
                         alt="${escapeHtml(item.title)}"
                         onerror="this.src='https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${escapeHtml(item.title)}</div>
                    <div class="cart-item-author">${escapeHtml(item.author || 'Автор не указан')}</div>
                    <div class="cart-item-price">
                        ${item.price} ₽ × ${item.quantity}
                        <span class="cart-item-type">${typeText}</span>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${item.id}" data-type="${item.type}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');
    
    if (cartTotalSpan) cartTotalSpan.textContent = total + ' ₽';
    
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const type = btn.dataset.type;
            removeFromCart(id, type);
        });
    });
}

function toggleCart() {
    const dropdown = document.getElementById('cartDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        renderCartDropdown();
    }
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Корзина пуста', 'Добавьте книги перед оформлением', 'error');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        showToast('Требуется авторизация', 'Войдите в аккаунт для оформления заказа', 'error');
        setTimeout(() => openModal(), 1500);
        return;
    }
    
    showToast('Заказ оформлен', 'Спасибо за покупку!', 'success');
    cart = [];
    saveCart();
    toggleCart();
}

// ========== ЗАГРУЗКА ПРОФИЛЯ ==========
async function loadProfile() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Ошибка загрузки профиля:', error);
            return;
        }
        
        profileData = profile;
        currentUser = user;
        displayProfile(profile);
        loadStats();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// ========== ОТОБРАЖЕНИЕ ПРОФИЛЯ ==========
function displayProfile(profile) {
    document.getElementById('profileUsername').textContent = profile.username || 'Пользователь';
    document.getElementById('profileEmail').textContent = currentUser.email || 'email@example.com';
    document.getElementById('profileRole').textContent = profile.role || 'Пользователь';
    
    // Форма редактирования
    document.getElementById('editUsername').value = profile.username || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editBio').value = profile.bio || '';
}

// ========== ЗАГРУЗКА СТАТИСТИКИ ==========
async function loadStats() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        // Подсчет аренд
        const { count: rentalsCount, error: rentalsError } = await supabase
            .from('rentals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);
        
        // Подсчет избранного
        const { count: favoritesCount, error: favoritesError } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        
        // Подсчет купленных книг (если есть таблица purchases)
        // Для примера используем количество возвращенных аренд
        const { count: booksCount, error: booksError } = await supabase
            .from('rentals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_returned', true);
        
        document.getElementById('statRentals').textContent = rentalsCount || 0;
        document.getElementById('statFavorites').textContent = favoritesCount || 0;
        document.getElementById('statBooks').textContent = booksCount || 0;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ========== СОХРАНЕНИЕ ПРОФИЛЯ ==========
async function saveProfile(event) {
    event.preventDefault();
    
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const user = getCurrentUser();
    
    if (!username) {
        showToast('Ошибка', 'Имя пользователя не может быть пустым', 'error');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                username: username,
                bio: bio,
                updated_at: new Date()
            })
            .eq('id', user.id);
        
        if (error) {
            console.error('Ошибка обновления:', error);
            showToast('Ошибка', 'Не удалось сохранить изменения', 'error');
            return;
        }
        
        showToast('Успешно', 'Профиль обновлен', 'success');
        // Обновляем отображение
        document.getElementById('profileUsername').textContent = username;
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось сохранить изменения', 'error');
    }
}

// ========== СМЕНА ПАРОЛЯ ==========
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Ошибка', 'Заполните все поля', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Ошибка', 'Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Ошибка', 'Пароли не совпадают', 'error');
        return;
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Ошибка смены пароля:', error);
            showToast('Ошибка', 'Не удалось сменить пароль. Проверьте текущий пароль', 'error');
            return;
        }
        
        showToast('Успешно', 'Пароль успешно изменен', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось сменить пароль', 'error');
    }
}

// ========== ЗАГРУЗКА АВАТАРА ==========
async function uploadAvatar(file) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar-${user.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) {
            console.error('Ошибка загрузки:', uploadError);
            showToast('Ошибка', 'Не удалось загрузить аватар', 'error');
            return;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        // Обновляем профиль с URL аватара
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);
        
        if (updateError) {
            console.error('Ошибка обновления:', updateError);
            return;
        }
        
        // Обновляем отображение
        const avatarCircle = document.getElementById('avatarCircle');
        avatarCircle.innerHTML = `<img src="${publicUrl}" alt="Аватар">`;
        showToast('Успешно', 'Аватар обновлен', 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось загрузить аватар', 'error');
    }
}

// ========== ВКЛАДКИ ==========
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активность у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Активируем выбранную
            tab.classList.add('active');
            const target = document.getElementById(`tab-${tab.dataset.tab}`);
            if (target) target.classList.add('active');
        });
    });
}

// ========== ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ ПАРОЛЯ ==========
function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                const isPassword = target.type === 'password';
                target.type = isPassword ? 'text' : 'password';
                btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    });
}

// ========== ЭКСПОРТ ФУНКЦИЙ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ ФАЙЛАХ ==========
window.checkout = checkout;
window.toggleCart = toggleCart;

// ========== УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ ==========
const modal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const modalTitle = document.getElementById('modalTitle');
const authMessage = document.getElementById('authMessage');

function openModal() {
    if (modal) {
        modal.style.display = 'block';
        showLoginForm();
    }
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
        clearAuthMessage();
    }
}

function showLoginForm() {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Вход в аккаунт';
    clearAuthMessage();
}

function showRegisterForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Регистрация';
    clearAuthMessage();
}

function showResetForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'block';
    if (modalTitle) modalTitle.textContent = 'Сброс пароля';
    clearAuthMessage();
}

function showAuthMessage(text, isError = true) {
    if (authMessage) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${isError ? 'error' : 'success'}`;
        authMessage.style.display = 'block';
        setTimeout(() => {
            if (authMessage) {
                authMessage.style.display = 'none';
            }
        }, 3000);
    }
}

function clearAuthMessage() {
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
        authMessage.style.display = 'none';
    }
}

async function updateUserUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userMenuContainer = document.getElementById('userMenuContainer');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenuContainer && userMenu) {
            userMenuContainer.innerHTML = '';
            userMenuContainer.appendChild(userMenu);
            userMenu.style.display = 'block';
            if (userName) userName.textContent = user.username || user.email?.split('@')[0] || 'Пользователь';
            
            const userInfo = userMenu.querySelector('.user-info');
            const dropdown = userMenu.querySelector('.user-dropdown');
            
            const newUserInfo = userInfo.cloneNode(true);
            userInfo.parentNode.replaceChild(newUserInfo, userInfo);
            
            newUserInfo.addEventListener('click', function(e) {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('show');
                document.querySelectorAll('.user-dropdown.show').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
            
            document.removeEventListener('click', window._closeUserMenu);
            window._closeUserMenu = function(e) {
                if (!userMenu.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            };
            document.addEventListener('click', window._closeUserMenu);
        }
    } else {
        if (authButtons) authButtons.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

async function handleRegister() {
    const username = document.getElementById('regUsername')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    if (!username || !email || !password) {
        showAuthMessage('Заполните все поля');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage('Пароли не совпадают');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    const result = await registerUser(email, password, username);
    
    if (result.success) {
        showAuthMessage('Регистрация успешна! Теперь войдите в аккаунт.', false);
        setTimeout(() => {
            showLoginForm();
        }, 2000);
    } else {
        showAuthMessage(result.error || 'Ошибка регистрации');
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAuthMessage('Заполните все поля');
        return;
    }
    
    const result = await loginUser(email, password);
    
    if (result.success) {
        showAuthMessage('Добро пожаловать!', false);
        setTimeout(async () => {
            closeModal();
            await updateUserUI();
            await loadProfile();
            window.location.reload();
        }, 1500);
    } else {
        showAuthMessage(result.error || 'Неверный email или пароль');
    }
}

async function handleLogout() {
    const result = await logoutUser();
    if (result.success) {
        showToast('Выход из аккаунта', 'Вы успешно вышли', 'success');
        window.location.href = 'index.html';
    } else {
        alert('Ошибка выхода: ' + result.error);
    }
}

async function handleResetPassword() {
    const email = document.getElementById('resetEmail')?.value;
    
    if (!email) {
        showAuthMessage('Введите email');
        return;
    }
    
    const result = await resetPassword(email);
    
    if (result.success) {
        showAuthMessage('Инструкции по сбросу пароля отправлены на email', false);
        setTimeout(() => {
            showLoginForm();
        }, 3000);
    } else {
        showAuthMessage(result.error || 'Ошибка сброса пароля');
    }
}

function setupAuth() {
    const openModalBtn = document.getElementById('openLoginModal');
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const forgotPassword = document.getElementById('forgotPassword');
    const backToLogin = document.getElementById('backToLogin');
    
    if (switchToRegister) switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    if (forgotPassword) forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        showResetForm();
    });
    
    if (backToLogin) backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const resetBtn = document.getElementById('resetBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (resetBtn) resetBtn.addEventListener('click', handleResetPassword);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const inputs = document.querySelectorAll('.auth-form input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (loginForm && loginForm.style.display !== 'none') handleLogin();
                else if (registerForm && registerForm.style.display !== 'none') handleRegister();
                else if (resetForm && resetForm.style.display !== 'none') handleResetPassword();
            }
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function mobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.querySelector('.nav');
    const actions = document.querySelector('.header-actions');
    
    if (btn && nav && actions) {
        let isOpen = false;
        btn.addEventListener('click', () => {
            if (!isOpen) {
                nav.style.display = 'flex';
                actions.style.display = 'flex';
                nav.style.flexDirection = 'column';
                nav.style.position = 'absolute';
                nav.style.top = '70px';
                nav.style.left = '0';
                nav.style.width = '100%';
                nav.style.backgroundColor = 'white';
                nav.style.padding = '20px';
                nav.style.gap = '16px';
                actions.style.position = 'absolute';
                actions.style.top = '200px';
                actions.style.left = '0';
                actions.style.width = '100%';
                actions.style.justifyContent = 'center';
                actions.style.backgroundColor = 'white';
                actions.style.padding = '16px';
                isOpen = true;
            } else {
                nav.style.display = '';
                actions.style.display = '';
                nav.style = '';
                actions.style = '';
                isOpen = false;
            }
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Профиль загружен, инициализация...');
    
    setupAuth();
    
    await checkCurrentUser();
    await updateUserUI();
    await loadProfile();
    
    setupTabs();
    setupPasswordToggles();
    
    mobileMenu();
    
    // Обработчик сохранения профиля
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    
    // Обработчик смены пароля
    document.getElementById('securityForm').addEventListener('submit', changePassword);
    
    // Обработчик загрузки аватара
    document.getElementById('avatarUploadBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });
    
    document.getElementById('avatarInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadAvatar(e.target.files[0]);
        }
    });
    
    // Сохранение настроек
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        showToast('Успешно', 'Настройки сохранены', 'success');
    });
    
    // Корзина
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCart();
        });
    }
    
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('cartDropdown');
        const cartButton = document.querySelector('.cart-btn');
        if (dropdown && cartButton && !cartButton.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
    
    updateCartBadge();
});