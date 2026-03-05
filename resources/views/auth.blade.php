<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>SYNAGLO - Login & Register</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            padding: var(--spacing-lg);
        }

        .auth-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: var(--radius-xl);
            padding: var(--spacing-2xl);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
            width: 100%;
            max-width: 450px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .auth-logo {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }

        .auth-logo img {
            width: 200px;
            height: auto;
        }

        .auth-form {
            display: none;
        }

        .auth-form.active {
            display: block;
        }

        .form-group {
            margin-bottom: var(--spacing-lg);
        }

        .form-label {
            display: block;
            font-size: var(--font-size-sm);
            font-weight: 600;
            margin-bottom: var(--spacing-xs);
        }

        .form-input {
            width: 100%;
            padding: var(--spacing-md);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            color: white;
        }

        .form-input:focus {
            outline: none;
            border-color: #667eea;
        }

        .btn-auth {
            width: 100%;
            padding: var(--spacing-md);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-weight: 600;
            cursor: pointer;
            margin-bottom: var(--spacing-md);
        }

        .btn-auth:hover {
            transform: translateY(-2px);
        }

        .form-footer {
            text-align: center;
            margin-top: var(--spacing-lg);
        }

        .form-link {
            color: #667eea;
            cursor: pointer;
            text-decoration: none;
        }

        .error-message {
            color: #ef4444;
            font-size: var(--font-size-sm);
            margin-top: var(--spacing-xs);
        }
    </style>
</head>

<body>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo">
                <p style="color: var(--text-secondary); margin-top: 20px;">AI-Powered Mental Health Monitoring</p>
            </div>

            <!-- Login Form -->
            <form class="auth-form active" id="loginForm">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="remember"> Remember me
                    </label>
                </div>
                <button type="submit" class="btn-auth">
                    <i class="fas fa-sign-in-alt"></i> Sign In
                </button>
                <div class="form-footer">
                    Don't have an account? <a class="form-link" onclick="switchForm('register')">Sign up now</a>
                </div>
            </form>

            <!-- Register Form -->
            <form class="auth-form" id="registerForm">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-input" required minlength="8">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" name="password_confirmation" class="form-input" required>
                </div>
                <button type="submit" class="btn-auth">
                    <i class="fas fa-user-plus"></i> Sign Up
                </button>
                <div class="form-footer">
                    Already have an account? <a class="form-link" onclick="switchForm('login')">Sign in now</a>
                </div>
            </form>
        </div>
    </div>

    <script>
        function switchForm(type) {
            document.getElementById('loginForm').classList.toggle('active', type === 'login');
            document.getElementById('registerForm').classList.toggle('active', type === 'register');
        }

        // Login handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        email: formData.get('email'),
                        password: formData.get('password'),
                        remember: formData.get('remember') === 'on'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed. Please try again.');
            }
        });

        // Register handler
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            if (formData.get('password') !== formData.get('password_confirmation')) {
                alert('Passwords do not match!');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        password: formData.get('password')
                    })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration failed. Please try again.');
            }
        });
    </script>
</body>

</html>