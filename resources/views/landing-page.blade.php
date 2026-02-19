<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - AI-Powered Biofeedback Glove for Early Depression Detection</title>
    <meta name="description"
        content="SYNAGLO - Innovative AI-powered biofeedback glove for early detection of hidden depression disorders. Real-time mental health monitoring.">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet">
</head>

<body>
    <!-- Navigation -->
    <nav class="main-nav">
        <div class="nav-container">
            <button class="mobile-menu-toggle" id="mobileMenuToggle">
                <i class="fas fa-bars"></i>
            </button>
            <div class="logo-section">
                <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo" class="nav-logo">
            </div>
            <ul class="nav-menu" id="navMenu">
                <li><a href="#home" class="nav-link active">Home</a></li>
                <li><a href="#about" class="nav-link">About</a></li>
                <li><a href="#features" class="nav-link">Features</a></li>
                <li><a href="#technology" class="nav-link">Technology</a></li>
                <li><a href="#contact" class="nav-link">Contact</a></li>
            </ul>
            <div class="nav-actions">
                <a href="/auth" class="btn-primary">Try Now</a>
            </div>
        </div>
    </nav>

    <!-- Mobile Menu Overlay (Blur Background) -->
    <div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>

    <!-- Hero Section -->
    <section class="hero" id="home">
        <div class="hero-background">
            <div class="gradient-overlay"></div>
        </div>
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">
                    <span class="title-highlight">SYNAGLO</span><br>
                    Early Depression Detection with AI Technology
                </h1>
                <p class="hero-subtitle">
                    AI-Powered Biofeedback Glove for Early Detection of Hidden Depression Disorders.
                    Real-time mental health monitoring with advanced technology.
                </p>
                <div class="hero-actions">
                    <a href="/dashboard" class="btn-hero-primary">
                        <i class="fas fa-play"></i>
                        Start Monitoring
                    </a>
                    <a href="#features" class="btn-hero-secondary">
                        <i class="fas fa-info-circle"></i>
                        Learn More
                    </a>
                </div>
                <div class="hero-stats">
                    <div class="stat-item">
                        <div class="stat-number">95%</div>
                        <div class="stat-label">Detection Accuracy</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">24/7</div>
                        <div class="stat-label">Real-time Monitoring</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">AI</div>
                        <div class="stat-label">AI-Powered</div>
                    </div>
                </div>
            </div>
            <div class="hero-image">
                <div class="hero-card">
                    <i class="fas fa-hand-holding-heart hero-icon"></i>
                    <h3>Biofeedback Glove</h3>
                    <p>Advanced technology for mental health monitoring</p>
                </div>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section class="about-section" id="about">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">About SYNAGLO</h2>
                <p class="section-subtitle">
                    Innovative solution for early detection of hidden depression disorders using biofeedback and AI
                    technology
                </p>
            </div>
            <div class="about-content">
                <div class="about-text">
                    <h3>Why SYNAGLO?</h3>
                    <p>
                        SYNAGLO is a revolutionary biofeedback glove that uses Artificial Intelligence technology
                        to detect early signs of hidden depression disorders. By combining advanced physiological
                        sensors
                        and cutting-edge AI algorithms, SYNAGLO provides accurate and real-time mental health
                        monitoring.
                    </p>
                    <p>
                        Hidden depression often goes undetected because its symptoms are not always clearly visible.
                        SYNAGLO addresses this problem by measuring various physiological parameters such as Heart Rate
                        Variability (HRV),
                        Galvanic Skin Response (GSR), body temperature, and physical activity to provide a comprehensive
                        picture
                        of a person's mental health condition.
                    </p>
                    <div class="about-features">
                        <div class="feature-badge">
                            <i class="fas fa-brain"></i>
                            <span>AI-Powered Analysis</span>
                        </div>
                        <div class="feature-badge">
                            <i class="fas fa-shield-alt"></i>
                            <span>Non-Invasive</span>
                        </div>
                        <div class="feature-badge">
                            <i class="fas fa-chart-line"></i>
                            <span>Real-time Monitoring</span>
                        </div>
                    </div>
                </div>
                <div class="about-image">
                    <div class="about-card">
                        <div class="card-icon">
                            <i class="fas fa-microchip"></i>
                        </div>
                        <h4>Advanced Technology</h4>
                        <p>Using state-of-the-art sensors and cutting-edge AI algorithms</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features-section" id="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Key Features</h2>
                <p class="section-subtitle">
                    Advanced features that make SYNAGLO the leading solution for mental health monitoring
                </p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-heartbeat"></i>
                    </div>
                    <h3>Heart Rate Variability (HRV)</h3>
                    <p>Measures the variation in time between heartbeats to assess autonomic nervous system condition
                        and stress levels.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-hand-sparkles"></i>
                    </div>
                    <h3>Galvanic Skin Response (GSR)</h3>
                    <p>Measures skin electrical conductivity to detect emotional responses and stress levels.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-thermometer-half"></i>
                    </div>
                    <h3>Temperature Monitoring</h3>
                    <p>Monitors body temperature to detect physiological changes related to mental condition.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-running"></i>
                    </div>
                    <h3>Activity Tracking</h3>
                    <p>Measures physical activity and movement patterns to assess activity levels and mental health.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <h3>AI-Powered Analysis</h3>
                    <p>Advanced AI algorithms analyze data to detect patterns and signs of hidden depression.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>Real-time Dashboard</h3>
                    <p>Interactive dashboard displays mental health data in real-time with easy-to-understand
                        visualizations.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Technology Section -->
    <section class="technology-section" id="technology">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Technology</h2>
                <p class="section-subtitle">
                    Cutting-edge technology that powers SYNAGLO
                </p>
            </div>
            <div class="tech-content">
                <div class="tech-item">
                    <div class="tech-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>Artificial Intelligence</h3>
                    <p>
                        Uses machine learning and deep learning to analyze physiological data patterns
                        and detect signs of depression with high accuracy.
                    </p>
                </div>
                <div class="tech-item">
                    <div class="tech-icon">
                        <span class="tech-icon-emoji">🔬</span>
                    </div>
                    <h3>Biofeedback Sensors</h3>
                    <p>
                        Advanced sensors integrated into the glove measure various physiological parameters
                        non-invasively and in real-time.
                    </p>
                </div>
                <div class="tech-item">
                    <div class="tech-icon">
                        <i class="fas fa-cloud"></i>
                    </div>
                    <h3>Cloud Computing</h3>
                    <p>
                        Data is processed and stored in the cloud for deeper analysis and access from multiple devices.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <div class="cta-content">
                <h2>Ready to Start Your Mental Health Journey?</h2>
                <p>Join SYNAGLO and get accurate, real-time mental health monitoring</p>
                <a href="dashboard.html" class="btn-cta">
                    <i class="fas fa-rocket"></i>
                    Get Started
                </a>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section" id="contact">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Contact Us</h2>
                <p class="section-subtitle">
                    Have questions? We're here to help you
                </p>
            </div>
            <div class="contact-content">
                <div class="contact-info">
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <h4>Email</h4>
                            <p>info@synaglo.com</p>
                        </div>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <h4>Phone</h4>
                            <p>+1 XXX XXX XXXX</p>
                        </div>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <h4>Address</h4>
                            <p>United States</p>
                        </div>
                    </div>
                </div>
                <div class="contact-form">
                    <form id="contactForm">
                        <div class="form-group">
                            <input type="text" placeholder="Your Name" required>
                        </div>
                        <div class="form-group">
                            <input type="email" placeholder="Your Email" required>
                        </div>
                        <div class="form-group">
                            <textarea placeholder="Your Message" rows="5" required></textarea>
                        </div>
                        <button type="submit" class="btn-submit">
                            <i class="fas fa-paper-plane"></i>
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <div class="footer-logo">
                        <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo" class="footer-logo-img">
                    </div>
                    <p>AI-Powered Biofeedback Glove for Early Detection of Hidden Depression Disorders</p>
                </div>
                <div class="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#about">About</a></li>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#technology">Technology</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Product</h4>
                    <ul>
                        <li><a href="dashboard.html">Dashboard</a></li>
                        <li><a href="analytics.html">Analytics</a></li>
                        <li><a href="health.html">Health</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Follow Us</h4>
                    <div class="social-links">
                        <a href="#"><i class="fab fa-facebook"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-linkedin"></i></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 SYNAGLO. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script src="{{ asset('js/index.js') }}"></script>
</body>

</html>