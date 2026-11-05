const form = document.getElementById('login-form');
const message = document.getElementById('message');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    window.location.href = '/app.html';
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
