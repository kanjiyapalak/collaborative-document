document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = e.target.username.value.trim();
  const password = e.target.password.value;

  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Login failed');

    // Save the JWT token to localStorage
    localStorage.setItem('token', data.token);

    // Redirect to index.html on success
    window.location.href = 'index.html';
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});
