<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAWATCH - Profile</title>
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
                        <h1>Profile</h1>
                        <p class="subtitle">Account settings</p>
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <i class="fas fa-edit"></i>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content profile-content">
        <!-- Profile Header -->
        <section class="profile-header">
            <div class="profile-avatar">
                <div class="avatar-circle">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <h2 class="profile-name">{{ $user->name }}</h2>
            <p class="profile-email">{{ $user->email }}</p>
            <div class="profile-badge">
                <i class="fas fa-star"></i>
                <span>Active User</span>
            </div>
        </section>

        <!-- Profile Stats -->
        <section class="profile-stats">
            <div class="stat-item">
                <div class="stat-value">{{ $daysActive }}</div>
                <div class="stat-label">Days Active</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{{ $totalSessions }}</div>
                <div class="stat-label">Sessions</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{{ $healthScore ?? '--' }}</div>
                <div class="stat-label">Health Score</div>
            </div>
        </section>

        <!-- Settings Menu -->
        <section class="settings-menu">
            <div class="menu-section">
                <h3 class="menu-section-title">Account</h3>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-user-circle"></i>
                        <span>Personal Information</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-bell"></i>
                        <span>Notifications</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-shield-alt"></i>
                        <span>Privacy & Security</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item" onclick="document.getElementById('logout-form').submit();">
                    <div class="menu-item-left">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <form id="logout-form" action="{{ route('logout') }}" method="POST" style="display: none;">
                    @csrf
                </form>
            </div>

            <div class="menu-section">
                <h3 class="menu-section-title">Health Data</h3>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-database"></i>
                        <span>Data Export</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-chart-line"></i>
                        <span>Health Reports</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-sliders-h"></i>
                        <span>Monitoring Settings</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>

            <div class="menu-section">
                <h3 class="menu-section-title">Support</h3>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-question-circle"></i>
                        <span>Help Center</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="menu-item">
                    <div class="menu-item-left">
                        <i class="fas fa-info-circle"></i>
                        <span>About Synaglo</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        </section>
    </main>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- API Integration Scripts -->
    <script src="{{ asset('js/api-integration.js') }}"></script>
    <script src="{{ asset('js/profile-integration.js') }}"></script>

    <!-- Navbar Component -->
    <script src="{{ asset('js/components/navbar.js') }}"></script>
</body>

</html>