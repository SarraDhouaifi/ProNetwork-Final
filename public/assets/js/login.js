document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. LOGIQUE AFFICHER/MASQUER LE MOT DE PASSE ---
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Basculer l'attribut type
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Basculer l'icône (œil / œil barré)
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // --- 2. LOGIQUE DE CONNEXION (AJAX) ---
    const loginForm = document.querySelector('#loginForm');
    const messageDiv = document.querySelector('#message');
    const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Empêche le rechargement de la page
            
            // Reset de l'état (efface les anciens messages)
            if (messageDiv) messageDiv.innerHTML = '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Signing in...';
            }

            // Récupération des données du formulaire
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Succès : Redirection
                    window.location.href = result.redirectUrl || '/feed';
                } else {
                    // Erreur (Bannissement 403, Mauvais identifiants 401, etc.)
                    const errorMsg = result.message || result.error || 'Login failed. Please try again.';
                    showError(errorMsg);
                    
                    // Réactiver le bouton si erreur
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = 'Sign In';
                    }
                }
            } catch (err) {
                console.error('Login error:', err);
                showError('A server error occurred. Please check your connection.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Sign In';
                }
            }
        });
    }

    /**
     * Affiche un message d'erreur stylisé dynamiquement
     */
    function showError(msg) {
        if (messageDiv) {
            messageDiv.innerHTML = `
                <div style="background-color: #FEE2E2; border: 1px solid #EF4444; color: #B91C1C; padding: 12px; border-radius: 8px; margin-top: 15px; display: flex; align-items: center; gap: 10px; font-size: 14px; text-align: left; animation: fadeIn 0.3s ease;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>${msg}</span>
                </div>
            `;
        }
    }
});