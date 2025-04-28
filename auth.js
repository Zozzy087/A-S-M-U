// Authentication system for the Flipbook
class FlipbookAuth {
    constructor() {
        this.tokenKey = 'flipbook_auth_token';
        this.emailKey = 'flipbook_auth_email';
        this.isAuthenticated = false;
        this.checkAuth();
        
        // Valid credentials
        this.validEmail = 'lughlleu@gmail.com';
        this.validPassword = 'zozzy';
    }

    // Initialize the auth system
    init() {
        // Check if we have stored credentials
        const token = localStorage.getItem(this.tokenKey);
        const email = localStorage.getItem(this.emailKey);
        
        if (token && email) {
            this.validateToken(token, email);
        } else {
            this.showLoginForm();
        }
    }

    // Show the login form
    showLoginForm() {
        const loginContainer = document.createElement('div');
        loginContainer.className = 'auth-container';
        loginContainer.innerHTML = `
            <div class="auth-form">
                <h2>Flipbook Access</h2>
                <form id="loginForm">
                    <input type="email" id="email" placeholder="Email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        `;
        document.body.appendChild(loginContainer);

        // Add event listener for form submission
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            this.validateCredentials(email, password);
        });
    }

    // Validate the email and password
    validateCredentials(email, password) {
        if (email === this.validEmail && password === this.validPassword) {
            this.isAuthenticated = true;
            // Generate a token based on the credentials
            const token = this.generateToken(email, password);
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.emailKey, email);
            this.hideLoginForm();
            window.dispatchEvent(new CustomEvent('auth-success'));
        } else {
            this.showError('Invalid email or password');
        }
    }

    // Generate a token based on credentials
    generateToken(email, password) {
        const combined = email + password;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    // Validate the token and email combination
    validateToken(token, email) {
        // Check if the stored token matches what we would generate
        const expectedToken = this.generateToken(email, this.validPassword);
        
        if (token === expectedToken) {
            this.isAuthenticated = true;
            this.hideLoginForm();
            window.dispatchEvent(new CustomEvent('auth-success'));
        } else {
            this.showError('Session expired. Please login again.');
            this.logout();
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        document.querySelector('.auth-form').appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Hide the login form
    hideLoginForm() {
        const form = document.querySelector('.auth-container');
        if (form) {
            form.remove();
        }
    }

    // Check if user is authenticated
    checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        const email = localStorage.getItem(this.emailKey);
        this.isAuthenticated = !!(token && email);
        return this.isAuthenticated;
    }

    // Logout
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.emailKey);
        this.isAuthenticated = false;
        this.showLoginForm();
        window.dispatchEvent(new CustomEvent('auth-logout'));
    }
}

// Export the auth system
window.FlipbookAuth = FlipbookAuth; 