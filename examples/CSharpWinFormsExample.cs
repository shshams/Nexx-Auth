using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace AuthAPIExample
{
    // Main AuthService Class
    public class AuthService
    {
        private static readonly HttpClient client = new HttpClient();
        private const string API_BASE = "https://24dff18d-18d0-4b5a-b988-058e9bf61703-00-3eqcnf9gyu1ms.picard.replit.dev/api";
        private const string API_KEY = "test-api-key-123";

        // User Login करने के लिए
        public async Task<AuthResponse> LoginUser(string username, string password)
        {
            var loginData = new
            {
                username = username,
                password = password,
                api_key = API_KEY
            };

            var json = JsonConvert.SerializeObject(loginData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync($"{API_BASE}/auth/login", content);
                var responseString = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<AuthResponse>(responseString);
                
                return result;
            }
            catch (Exception ex)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = $"Network Error: {ex.Message}" 
                };
            }
        }

        // नया User Register करने के लिए
        public async Task<AuthResponse> RegisterUser(string username, string password, string email)
        {
            var registerData = new
            {
                username = username,
                password = password,
                email = email,
                api_key = API_KEY
            };

            var json = JsonConvert.SerializeObject(registerData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync($"{API_BASE}/auth/register", content);
                var responseString = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<AuthResponse>(responseString);
                
                return result;
            }
            catch (Exception ex)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = $"Network Error: {ex.Message}" 
                };
            }
        }

        // Session Verify करने के लिए
        public async Task<AuthResponse> VerifySession(string sessionToken)
        {
            var verifyData = new
            {
                session_token = sessionToken,
                api_key = API_KEY
            };

            var json = JsonConvert.SerializeObject(verifyData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync($"{API_BASE}/auth/verify", content);
                var responseString = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<AuthResponse>(responseString);
                
                return result;
            }
            catch (Exception ex)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = $"Network Error: {ex.Message}" 
                };
            }
        }
    }

    // Response के लिए class
    public class AuthResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }
        
        [JsonProperty("message")]
        public string Message { get; set; }
        
        [JsonProperty("user_id")]
        public string UserId { get; set; }
        
        [JsonProperty("session_token")]
        public string SessionToken { get; set; }
    }

    // Login Form Example
    public partial class LoginForm : Form
    {
        private TextBox txtUsername;
        private TextBox txtPassword;
        private Button btnLogin;
        private Button btnRegister;
        private Label lblMessage;

        public LoginForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "AuthAPI Login Example";
            this.Size = new System.Drawing.Size(400, 300);
            this.StartPosition = FormStartPosition.CenterScreen;

            // Username Label
            var lblUsername = new Label()
            {
                Text = "Username:",
                Location = new System.Drawing.Point(30, 30),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblUsername);

            // Username TextBox
            txtUsername = new TextBox()
            {
                Location = new System.Drawing.Point(140, 30),
                Size = new System.Drawing.Size(200, 23)
            };
            this.Controls.Add(txtUsername);

            // Password Label
            var lblPassword = new Label()
            {
                Text = "Password:",
                Location = new System.Drawing.Point(30, 70),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblPassword);

            // Password TextBox
            txtPassword = new TextBox()
            {
                Location = new System.Drawing.Point(140, 70),
                Size = new System.Drawing.Size(200, 23),
                PasswordChar = '*'
            };
            this.Controls.Add(txtPassword);

            // Login Button
            btnLogin = new Button()
            {
                Text = "Login",
                Location = new System.Drawing.Point(140, 120),
                Size = new System.Drawing.Size(80, 30)
            };
            btnLogin.Click += BtnLogin_Click;
            this.Controls.Add(btnLogin);

            // Register Button
            btnRegister = new Button()
            {
                Text = "Register",
                Location = new System.Drawing.Point(230, 120),
                Size = new System.Drawing.Size(80, 30)
            };
            btnRegister.Click += BtnRegister_Click;
            this.Controls.Add(btnRegister);

            // Message Label
            lblMessage = new Label()
            {
                Location = new System.Drawing.Point(30, 170),
                Size = new System.Drawing.Size(320, 60),
                ForeColor = System.Drawing.Color.Red,
                Text = ""
            };
            this.Controls.Add(lblMessage);
        }

        private async void BtnLogin_Click(object sender, EventArgs e)
        {
            // Validation
            if (string.IsNullOrEmpty(txtUsername.Text))
            {
                lblMessage.Text = "Username enter करें!";
                lblMessage.ForeColor = System.Drawing.Color.Red;
                return;
            }

            if (string.IsNullOrEmpty(txtPassword.Text))
            {
                lblMessage.Text = "Password enter करें!";
                lblMessage.ForeColor = System.Drawing.Color.Red;
                return;
            }

            // Disable button during login
            btnLogin.Enabled = false;
            btnLogin.Text = "Logging in...";
            lblMessage.Text = "Please wait...";
            lblMessage.ForeColor = System.Drawing.Color.Blue;

            try
            {
                var authService = new AuthService();
                var result = await authService.LoginUser(txtUsername.Text, txtPassword.Text);
                
                if (result.Success)
                {
                    lblMessage.Text = $"Login successful! User ID: {result.UserId}";
                    lblMessage.ForeColor = System.Drawing.Color.Green;
                    
                    // यहां आप next form खोल सकते हैं
                    MessageBox.Show("Login successful! अब आप अपना next form खोल सकते हैं।", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    lblMessage.Text = $"Login failed: {result.Message}";
                    lblMessage.ForeColor = System.Drawing.Color.Red;
                }
            }
            catch (Exception ex)
            {
                lblMessage.Text = $"Error: {ex.Message}";
                lblMessage.ForeColor = System.Drawing.Color.Red;
            }
            finally
            {
                btnLogin.Enabled = true;
                btnLogin.Text = "Login";
            }
        }

        private async void BtnRegister_Click(object sender, EventArgs e)
        {
            // Simple registration - आप चाहें तो separate form बना सकते हैं
            var registerForm = new RegisterForm();
            registerForm.ShowDialog();
        }
    }

    // Registration Form Example
    public partial class RegisterForm : Form
    {
        private TextBox txtUsername;
        private TextBox txtPassword;
        private TextBox txtEmail;
        private Button btnRegister;
        private Label lblMessage;

        public RegisterForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Register New User";
            this.Size = new System.Drawing.Size(400, 350);
            this.StartPosition = FormStartPosition.CenterScreen;

            // Username
            var lblUsername = new Label()
            {
                Text = "Username:",
                Location = new System.Drawing.Point(30, 30),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblUsername);

            txtUsername = new TextBox()
            {
                Location = new System.Drawing.Point(140, 30),
                Size = new System.Drawing.Size(200, 23)
            };
            this.Controls.Add(txtUsername);

            // Email
            var lblEmail = new Label()
            {
                Text = "Email:",
                Location = new System.Drawing.Point(30, 70),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblEmail);

            txtEmail = new TextBox()
            {
                Location = new System.Drawing.Point(140, 70),
                Size = new System.Drawing.Size(200, 23)
            };
            this.Controls.Add(txtEmail);

            // Password
            var lblPassword = new Label()
            {
                Text = "Password:",
                Location = new System.Drawing.Point(30, 110),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblPassword);

            txtPassword = new TextBox()
            {
                Location = new System.Drawing.Point(140, 110),
                Size = new System.Drawing.Size(200, 23),
                PasswordChar = '*'
            };
            this.Controls.Add(txtPassword);

            // Register Button
            btnRegister = new Button()
            {
                Text = "Register",
                Location = new System.Drawing.Point(140, 160),
                Size = new System.Drawing.Size(100, 30)
            };
            btnRegister.Click += BtnRegister_Click;
            this.Controls.Add(btnRegister);

            // Message Label
            lblMessage = new Label()
            {
                Location = new System.Drawing.Point(30, 210),
                Size = new System.Drawing.Size(320, 80),
                ForeColor = System.Drawing.Color.Red,
                Text = ""
            };
            this.Controls.Add(lblMessage);
        }

        private async void BtnRegister_Click(object sender, EventArgs e)
        {
            // Validation
            if (string.IsNullOrEmpty(txtUsername.Text) || 
                string.IsNullOrEmpty(txtPassword.Text) || 
                string.IsNullOrEmpty(txtEmail.Text))
            {
                lblMessage.Text = "सभी fields भरें!";
                lblMessage.ForeColor = System.Drawing.Color.Red;
                return;
            }

            btnRegister.Enabled = false;
            btnRegister.Text = "Registering...";
            lblMessage.Text = "Please wait...";
            lblMessage.ForeColor = System.Drawing.Color.Blue;

            try
            {
                var authService = new AuthService();
                var result = await authService.RegisterUser(txtUsername.Text, txtPassword.Text, txtEmail.Text);
                
                if (result.Success)
                {
                    lblMessage.Text = $"Registration successful!\nUser ID: {result.UserId}";
                    lblMessage.ForeColor = System.Drawing.Color.Green;
                    
                    MessageBox.Show("User registered successfully!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    this.Close();
                }
                else
                {
                    lblMessage.Text = $"Registration failed: {result.Message}";
                    lblMessage.ForeColor = System.Drawing.Color.Red;
                }
            }
            catch (Exception ex)
            {
                lblMessage.Text = $"Error: {ex.Message}";
                lblMessage.ForeColor = System.Drawing.Color.Red;
            }
            finally
            {
                btnRegister.Enabled = true;
                btnRegister.Text = "Register";
            }
        }
    }

    // Main Program
    public class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LoginForm());
        }
    }
}