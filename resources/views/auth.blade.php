<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - Login & Register</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Auth Page Specific Styles */
        .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            padding: var(--spacing-lg);
        }

        .auth-card {
            background: var(--bg-card);
            border-radius: var(--radius-xl);
            padding: var(--spacing-2xl);
            box-shadow: var(--shadow-xl);
            width: 100%;
            max-width: 450px;
            border: 1px solid var(--border-color);
        }

        .auth-header {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }

        .auth-logo {
            width: 100%;
            margin: 0 auto var(--spacing-xs);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .auth-logo img {
            width: 200px;
            height: auto;
            aspect-ratio: 2 / 1;
            object-fit: contain;
        }

        .auth-subtitle {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            margin-top: -25px;
            margin-bottom: var(--spacing-xl);
        }

        .auth-form {
            display: none;
        }

        .auth-form.active {
            display: block;
        }

        .form-group {
            margin-bottom: var(--spacing-lg);
            position: relative;
        }

        .form-label {
            display: block;
            font-size: var(--font-size-sm);
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--spacing-xs);
        }

        .form-input-wrapper {
            position: relative;
        }

        .form-input {
            width: 100%;
            padding: var(--spacing-md);
            padding-right: 45px;
            border: 2px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            font-family: var(--font-family);
            color: var(--text-primary);
            background: var(--bg-card);
            transition: all var(--transition-base);
        }

        .form-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input::placeholder {
            color: var(--text-light);
        }

        /* Hide default password show/hide button */
        .form-input[type="password"]::-webkit-credentials-auto-fill-button,
        .form-input[type="password"]::-webkit-strong-password-auto-fill-button {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
            display: none !important;
        }

        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: var(--spacing-xs);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color var(--transition-fast);
        }

        .password-toggle:hover {
            color: #667eea;
        }

        .form-checkbox-group {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            margin-bottom: var(--spacing-lg);
        }

        .form-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #667eea;
        }

        .form-checkbox-label {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            cursor: pointer;
        }

        .form-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            transition: color var(--transition-fast);
        }

        .form-link:hover {
            color: #764ba2;
        }

        .btn-auth {
            width: 100%;
            padding: var(--spacing-md) var(--spacing-lg);
            border: none;
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-base);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
        }

        .btn-auth-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-auth-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-auth-google {
            background: white;
            color: #3c4043;
            border: 1px solid #dadce0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .btn-auth-google:hover {
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            background: #f8f9fa;
        }

        .google-icon {
            width: 20px;
            height: 20px;
            display: inline-block;
        }

        .google-icon svg {
            width: 100%;
            height: 100%;
        }

        .auth-divider {
            display: flex;
            align-items: center;
            margin: var(--spacing-lg) 0;
            text-align: center;
        }

        .auth-divider::before,
        .auth-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border-color);
        }

        .auth-divider span {
            padding: 0 var(--spacing-md);
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
        }

        .form-footer {
            text-align: center;
            margin-top: var(--spacing-lg);
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
        }

        @media (max-width: 480px) {
            .auth-card {
                padding: var(--spacing-lg);
            }
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <div class="auth-logo">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo">
                </div>
                <p class="auth-subtitle">AI-Powered Mental Health Monitoring</p>
            </div>

            <!-- Login Form -->
            <form class="auth-form active" id="loginForm">
                <div class="form-group">
                    <label class="form-label" for="loginEmail">Email</label>
                    <div class="form-input-wrapper">
                        <input type="email" id="loginEmail" class="form-input" placeholder="your@email.com" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="loginPassword">Password</label>
                    <div class="form-input-wrapper">
                        <input type="password" id="loginPassword" class="form-input" placeholder="Enter password" required>
                        <button type="button" class="password-toggle" onclick="togglePassword('loginPassword', this)">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <div class="form-checkbox-group">
                    <input type="checkbox" id="rememberMe" class="form-checkbox">
                    <label for="rememberMe" class="form-checkbox-label">Remember me</label>
                    <a href="#" class="form-link" style="margin-left: auto;">Forgot password?</a>
                </div>

                <button type="submit" class="btn-auth btn-auth-primary">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Sign In</span>
                </button>

                <div class="auth-divider">
                    <span>or</span>
                </div>

                <button type="button" class="btn-auth btn-auth-google" onclick="loginWithGoogle()">
                    <span class="google-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </span>
                    <span>Sign in with Google</span>
                </button>

                <div class="form-footer">
                    Don't have an account? <a href="#" class="form-link" onclick="switchTab('register'); return false;">Sign up now</a>
                </div>
            </form>

            <!-- Register Form -->
            <form class="auth-form" id="registerForm">
                <div class="form-group">
                    <label class="form-label" for="registerName">Full Name</label>
                    <div class="form-input-wrapper">
                        <input type="text" id="registerName" class="form-input" placeholder="Your full name" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="registerEmail">Email</label>
                    <div class="form-input-wrapper">
                        <input type="email" id="registerEmail" class="form-input" placeholder="your@email.com" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="registerPassword">Password</label>
                    <div class="form-input-wrapper">
                        <input type="password" id="registerPassword" class="form-input" placeholder="Minimum 8 characters" required>
                        <button type="button" class="password-toggle" onclick="togglePassword('registerPassword', this)">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="registerConfirmPassword">Confirm Password</label>
                    <div class="form-input-wrapper">
                        <input type="password" id="registerConfirmPassword" class="form-input" placeholder="Repeat password" required>
                        <button type="button" class="password-toggle" onclick="togglePassword('registerConfirmPassword', this)">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <div class="form-checkbox-group">
                    <input type="checkbox" id="agreeTerms" class="form-checkbox" required>
                    <label for="agreeTerms" class="form-checkbox-label">
                        I agree to the <a href="#" class="form-link">Terms & Conditions</a> and <a href="#" class="form-link">Privacy Policy</a>
                    </label>
                </div>

                <button type="submit" class="btn-auth btn-auth-primary">
                    <i class="fas fa-user-plus"></i>
                    <span>Sign Up</span>
                </button>

                <div class="auth-divider">
                    <span>or</span>
                </div>

                <button type="button" class="btn-auth btn-auth-google" onclick="loginWithGoogle()">
                    <span class="google-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </span>
                    <span>Sign up with Google</span>
                </button>

                <div class="form-footer">
                    Already have an account? <a href="#" class="form-link" onclick="switchTab('login'); return false;">Sign in now</a>
                </div>
            </form>
        </div>
    </div>

    <!-- Firebase SDK -->
    <script type="module">
        // Import Firebase modules
        import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
        
        // Load Firebase config from centralized file
        const { initializeFirebase } = await import('/js/components/firebase-loader.js');
        const { auth, db } = await initializeFirebase();
        const googleProvider = new GoogleAuthProvider();

        // Make functions available globally
        window.firebaseAuth = auth;
        window.firebaseDb = db;

        // Switch between login and register forms
        function switchTab(tab) {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');

            if (tab === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        }

        // Toggle password visibility
        function togglePassword(inputId, button) {
            const input = document.getElementById(inputId);
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        // Login with Google
        async function loginWithGoogle() {
            try {
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;
                
                // Check if user document exists, if not create it
                // This ensures first-time login users can create their document
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    // Create user document for first-time login
                    await setDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        photoURL: user.photoURL || null,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    // Update last login for existing users
                    await setDoc(userDocRef, {
                        lastLogin: new Date().toISOString(),
                        photoURL: user.photoURL || userDoc.data().photoURL
                    }, { merge: true });
                }
                
                // Store user ID in sessionStorage or localStorage
                // This will be used by dashboard to verify user before auth guard redirects
                sessionStorage.setItem('userId', user.uid);
                sessionStorage.setItem('userEmail', user.email || '');
                sessionStorage.setItem('loginTimestamp', Date.now().toString());
                
                console.log('User ID stored (Google):', user.uid);
                
                // Redirect to dashboard immediately
                // Dashboard will check sessionStorage first
                window.location.href = "{{ url('/dashboard') }}";
            } catch (error) {
                console.error('Error signing in with Google:', error);
                alert('Failed to sign in with Google: ' + error.message);
            }
        }

        // Form submission handlers
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Check if user document exists, if not create it
                // This ensures first-time login users can create their document
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    // Create user document for first-time login
                    await setDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    // Update last login for existing users
                    await setDoc(userDocRef, {
                        lastLogin: new Date().toISOString()
                    }, { merge: true });
                }
                
                // Store user ID in sessionStorage or localStorage
                // This will be used by dashboard to verify user before auth guard redirects
                if (rememberMe) {
                    localStorage.setItem('userId', user.uid);
                    localStorage.setItem('userEmail', user.email || '');
                } else {
                    sessionStorage.setItem('userId', user.uid);
                    sessionStorage.setItem('userEmail', user.email || '');
                }
                
                // Store timestamp to track when login happened
                const loginTimestamp = Date.now();
                if (rememberMe) {
                    localStorage.setItem('loginTimestamp', loginTimestamp.toString());
                } else {
                    sessionStorage.setItem('loginTimestamp', loginTimestamp.toString());
                }
                
                console.log('User ID stored:', user.uid);
                
                // Redirect to dashboard immediately
                // Dashboard will check sessionStorage/localStorage first
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Error signing in:', error);
                let errorMessage = 'Failed to sign in. ';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage += 'Email not registered.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage += 'Incorrect password.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email format.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage += 'Too many attempts. Please try again later.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                
                if (typeof showModal === 'function') {
                    showModal('Sign In Error', errorMessage, []);
                } else {
                    alert(errorMessage);
                }
            }
        });

        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Validate password match
            if (password !== confirmPassword) {
                if (typeof showModal === 'function') {
                    showModal('Password Mismatch', 'Password and confirm password do not match!', []);
                } else {
                    alert('Password and confirm password do not match!');
                }
                return;
            }
            
            // Validate password length
            if (password.length < 8) {
                if (typeof showModal === 'function') {
                    showModal('Password Too Short', 'Password must be at least 8 characters!', []);
                } else {
                    alert('Password must be at least 8 characters!');
                }
                return;
            }
            
            try {
                // Create user account
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Save user data to Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    displayName: name,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                });
                
                if (typeof showModal === 'function') {
                    showModal('Registration Successful', 'Registration successful! Please sign in...', []);
                    setTimeout(() => {
                        switchTab('login');
                        hideModal();
                    }, 1500);
                } else {
                    alert('Registration successful! Please sign in...');
                    switchTab('login');
                }
            } catch (error) {
                console.error('Error registering:', error);
                let errorMessage = 'Failed to register. ';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage += 'Email already registered.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email format.';
                        break;
                    case 'auth/weak-password':
                        errorMessage += 'Password too weak.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                
                if (typeof showModal === 'function') {
                    showModal('Sign In Error', errorMessage, []);
                } else {
                    alert(errorMessage);
                }
            }
        });

        // Check if user is already logged in
        // Check if user is already logged in (handled by auth guard)
        // Don't add another listener here to avoid conflicts

        // Make functions available globally
        window.switchTab = switchTab;
        window.togglePassword = togglePassword;
        window.loginWithGoogle = loginWithGoogle;
    </script>

    <!-- Modal Container -->
    <div id="modalOverlay" class="modal-overlay" style="display: none;">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">Error</h3>
                <button class="modal-close-btn" id="modalCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-icon">
                    <i class="fas fa-exclamation-triangle" id="modalIcon"></i>
                </div>
                <p class="modal-message" id="modalMessage"></p>
                <div class="modal-checklist" id="modalChecklist" style="display: none;">
                    <p class="modal-checklist-title">Make sure:</p>
                    <ul class="modal-checklist-items" id="modalChecklistItems"></ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-primary" id="modalOkBtn">OK</button>
            </div>
        </div>
    </div>

    <script>
        /**
         * Show modal dialog with backdrop blur
         * @param {string} title - Modal title
         * @param {string} message - Modal message
         * @param {Array<string>} checklistItems - Optional checklist items
         */
        function showModal(title, message, checklistItems = []) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const modalChecklist = document.getElementById('modalChecklist');
            const modalChecklistItems = document.getElementById('modalChecklistItems');
            const modalCloseBtn = document.getElementById('modalCloseBtn');
            const modalOkBtn = document.getElementById('modalOkBtn');
            
            if (!modalOverlay) return;
            
            // Set modal content
            if (modalTitle) modalTitle.textContent = title;
            if (modalMessage) modalMessage.textContent = message;
            
            // Show/hide checklist
            if (modalChecklist) {
                if (checklistItems && checklistItems.length > 0) {
                    modalChecklist.style.display = 'block';
                    if (modalChecklistItems) {
                        modalChecklistItems.innerHTML = '';
                        checklistItems.forEach(item => {
                            const li = document.createElement('li');
                            li.textContent = item;
                            modalChecklistItems.appendChild(li);
                        });
                    }
                } else {
                    modalChecklist.style.display = 'none';
                }
            }
            
            // Show modal
            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            
            // Close handlers
            const closeModal = () => {
                modalOverlay.style.display = 'none';
                document.body.style.overflow = ''; // Restore scrolling
            };
            
            if (modalCloseBtn) {
                modalCloseBtn.onclick = closeModal;
            }
            
            if (modalOkBtn) {
                modalOkBtn.onclick = closeModal;
            }
            
            // Close on overlay click
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            };
            
            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
        
        /**
         * Hide modal
         */
        function hideModal() {
            const modalOverlay = document.getElementById('modalOverlay');
            if (modalOverlay) {
                modalOverlay.style.display = 'none';
                document.body.style.overflow = ''; // Restore scrolling
            }
        }
        
        // Make showModal available globally
        window.showModal = showModal;
        window.hideModal = hideModal;
    </script>
</body>
</html>
