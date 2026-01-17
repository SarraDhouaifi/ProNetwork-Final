document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        });
    }

    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const submitBtn = document.getElementById('submitBtn');
    const blockedDomains = ['mailinator.com', '10minutemail.com', 'tempmail.com', 'yopmail.com'];

    if (emailInput) {
        emailInput.addEventListener('input', function() {
            this.value = this.value.toLowerCase().trim();
        });

        emailInput.addEventListener('blur', function() {
            const email = this.value;
            if (email.includes('@')) {
                const domain = email.split('@')[1];
                if (blockedDomains.includes(domain)) {
                    emailError.innerText = "Please use a professional or permanent email address.";
                    emailError.style.display = 'block';
                    if(submitBtn) submitBtn.disabled = true;
                } else {
                    emailError.style.display = 'none';
                    if(submitBtn) submitBtn.disabled = false;
                }
            }
        });
    }

    const requirements = document.getElementById('pwdRequirements');
    const generateBtn = document.getElementById('generatePasswordBtn');
    
    const reqList = {
        length: { regex: /^.{8,12}$/, el: document.getElementById('req-length') },
        upper: { regex: /[A-Z]/, el: document.getElementById('req-upper') },
        lower: { regex: /[a-z]/, el: document.getElementById('req-lower') },
        number: { regex: /[0-9]/, el: document.getElementById('req-number') },
        special: { regex: /[!@#$%^&*]/, el: document.getElementById('req-special') },
        noSpace: { regex: /^\S*$/, el: document.getElementById('req-space') }
    };

    function validatePassword(val) {
        let isValid = true;
        for (const key in reqList) {
            const req = reqList[key];
            if (!req.el) continue;

            const isMet = req.regex.test(val);
            const icon = req.el.querySelector('i');

            if (isMet) {
                req.el.classList.add('valid');
                req.el.classList.remove('invalid');
                icon.classList.remove('fa-circle', 'fa-times-circle');
                icon.classList.add('fa-check-circle');
            } else {
                req.el.classList.add('invalid');
                req.el.classList.remove('valid');
                icon.classList.remove('fa-circle', 'fa-check-circle');
                icon.classList.add('fa-times-circle');
                isValid = false;
            }
        }
        if (submitBtn) submitBtn.disabled = !isValid;
    }

    if (passwordInput && requirements) {
        passwordInput.addEventListener('focus', () => {
            requirements.style.display = 'block';
        });

        passwordInput.addEventListener('input', function() {
            validatePassword(this.value);
        });

        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                const length = 12;
                const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                let password = "";
                
                password += "A";
                password += "a";
                password += "1";
                password += "!";

                for (let i = 4; i < length; i++) {
                    const randomIndex = Math.floor(Math.random() * charset.length);
                    password += charset[randomIndex];
                }

                password = password.split('').sort(() => 0.5 - Math.random()).join('');

                passwordInput.value = password;
                passwordInput.setAttribute('type', 'text');
                
                if (togglePassword) {
                    togglePassword.classList.remove('fa-eye');
                    togglePassword.classList.add('fa-eye-slash');
                }
                
                requirements.style.display = 'block';
                validatePassword(password);
            });
        }
    }

    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const submitButton = registerForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerText = "Registering...";

            const data = {
                firstName: registerForm.querySelector('input[name="firstName"]').value,
                lastName: registerForm.querySelector('input[name="lastName"]').value,
                email: registerForm.querySelector('input[name="email"]').value,
                password: registerForm.querySelector('input[name="password"]').value
            };

            try {
                const res = await fetch('/register/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (res.ok) {
                    window.location.href = '/onboarding';
                } else {
                    const msgDiv = document.getElementById('message');
                    if(msgDiv) {
                        msgDiv.innerText = result.message || "Registration failed";
                        msgDiv.style.color = "#e63946";
                    }
                    submitButton.disabled = false;
                    submitButton.innerText = "Join Now";
                }
            } catch (err) {
                console.error(err);
                const msgDiv = document.getElementById('message');
                if(msgDiv) {
                    msgDiv.innerText = "Server error. Please try again.";
                    msgDiv.style.color = "#e63946";
                }
                submitButton.disabled = false;
                submitButton.innerText = "Join Now";
            }
        });
    }
});