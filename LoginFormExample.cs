using System;
using System.Threading.Tasks;
using System.Windows.Forms;

public partial class LoginForm : Form
{
    private NexxAuth _auth;
    private TextBox txtUsername;
    private TextBox txtPassword;
    private Button btnLogin;
    private Button btnRegister;
    private Label lblStatus;

    public LoginForm()
    {
        InitializeComponent();
        // Replace with your actual API key from the dashboard
        _auth = new NexxAuth("your-api-key-here", "1.0.0", "https://your-replit-url.replit.dev/api/v1");
    }

    private void InitializeComponent()
    {
        this.Text = "NexxAuth Login";
        this.Size = new System.Drawing.Size(400, 300);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;

        // Username
        Label lblUsername = new Label()
        {
            Text = "Username:",
            Location = new System.Drawing.Point(20, 30),
            Size = new System.Drawing.Size(80, 23)
        };
        this.Controls.Add(lblUsername);

        txtUsername = new TextBox()
        {
            Location = new System.Drawing.Point(110, 30),
            Size = new System.Drawing.Size(250, 23)
        };
        this.Controls.Add(txtUsername);

        // Password
        Label lblPassword = new Label()
        {
            Text = "Password:",
            Location = new System.Drawing.Point(20, 70),
            Size = new System.Drawing.Size(80, 23)
        };
        this.Controls.Add(lblPassword);

        txtPassword = new TextBox()
        {
            Location = new System.Drawing.Point(110, 70),
            Size = new System.Drawing.Size(250, 23),
            UseSystemPasswordChar = true
        };
        this.Controls.Add(txtPassword);

        // Login Button
        btnLogin = new Button()
        {
            Text = "Login",
            Location = new System.Drawing.Point(110, 120),
            Size = new System.Drawing.Size(100, 30)
        };
        btnLogin.Click += BtnLogin_Click;
        this.Controls.Add(btnLogin);

        // Register Button
        btnRegister = new Button()
        {
            Text = "Register",
            Location = new System.Drawing.Point(220, 120),
            Size = new System.Drawing.Size(100, 30)
        };
        btnRegister.Click += BtnRegister_Click;
        this.Controls.Add(btnRegister);

        // Status Label
        lblStatus = new Label()
        {
            Text = "Ready",
            Location = new System.Drawing.Point(20, 170),
            Size = new System.Drawing.Size(340, 60),
            ForeColor = System.Drawing.Color.Blue
        };
        this.Controls.Add(lblStatus);
    }

    private async void BtnLogin_Click(object sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(txtUsername.Text) || string.IsNullOrWhiteSpace(txtPassword.Text))
        {
            MessageBox.Show("Please enter both username and password.", "Missing Information", 
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        btnLogin.Enabled = false;
        lblStatus.Text = "Authenticating...";
        lblStatus.ForeColor = System.Drawing.Color.Orange;

        try
        {
            // Use the enhanced login method with automatic error handling
            var response = await _auth.LoginWithErrorHandlingAsync(txtUsername.Text, txtPassword.Text);

            if (response.Success)
            {
                lblStatus.Text = $"Login successful! Welcome, {response.Username}";
                lblStatus.ForeColor = System.Drawing.Color.Green;
                
                // Store user information for the session
                Properties.Settings.Default.UserId = response.UserId ?? 0;
                Properties.Settings.Default.Username = response.Username;
                Properties.Settings.Default.Save();

                // Hide login form and show main application
                this.Hide();
                var mainForm = new MainForm();
                mainForm.Show();
            }
            else
            {
                lblStatus.Text = "Login failed: " + response.Message;
                lblStatus.ForeColor = System.Drawing.Color.Red;
                // Error handling is automatically done by LoginWithErrorHandlingAsync
            }
        }
        catch (Exception ex)
        {
            lblStatus.Text = "Connection error: " + ex.Message;
            lblStatus.ForeColor = System.Drawing.Color.Red;
            MessageBox.Show("Unable to connect to authentication server. Please check your internet connection.", 
                "Connection Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnLogin.Enabled = true;
        }
    }

    private async void BtnRegister_Click(object sender, EventArgs e)
    {
        var registerForm = new RegisterForm(_auth);
        registerForm.ShowDialog();
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        _auth?.Dispose();
        base.OnFormClosed(e);
    }
}

// Simple registration form example
public partial class RegisterForm : Form
{
    private NexxAuth _auth;
    private TextBox txtUsername;
    private TextBox txtEmail;
    private TextBox txtPassword;
    private Button btnRegister;

    public RegisterForm(NexxAuth auth)
    {
        _auth = auth;
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        this.Text = "Register New Account";
        this.Size = new System.Drawing.Size(400, 250);
        this.StartPosition = FormStartPosition.CenterParent;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;

        // Username
        this.Controls.Add(new Label() { Text = "Username:", Location = new System.Drawing.Point(20, 30), Size = new System.Drawing.Size(80, 23) });
        txtUsername = new TextBox() { Location = new System.Drawing.Point(110, 30), Size = new System.Drawing.Size(250, 23) };
        this.Controls.Add(txtUsername);

        // Email
        this.Controls.Add(new Label() { Text = "Email:", Location = new System.Drawing.Point(20, 70), Size = new System.Drawing.Size(80, 23) });
        txtEmail = new TextBox() { Location = new System.Drawing.Point(110, 70), Size = new System.Drawing.Size(250, 23) };
        this.Controls.Add(txtEmail);

        // Password
        this.Controls.Add(new Label() { Text = "Password:", Location = new System.Drawing.Point(20, 110), Size = new System.Drawing.Size(80, 23) });
        txtPassword = new TextBox() { Location = new System.Drawing.Point(110, 110), Size = new System.Drawing.Size(250, 23), UseSystemPasswordChar = true };
        this.Controls.Add(txtPassword);

        // Register Button
        btnRegister = new Button() { Text = "Register", Location = new System.Drawing.Point(160, 160), Size = new System.Drawing.Size(100, 30) };
        btnRegister.Click += BtnRegister_Click;
        this.Controls.Add(btnRegister);
    }

    private async void BtnRegister_Click(object sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(txtUsername.Text) || string.IsNullOrWhiteSpace(txtEmail.Text) || string.IsNullOrWhiteSpace(txtPassword.Text))
        {
            MessageBox.Show("Please fill in all fields.", "Missing Information", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        btnRegister.Enabled = false;

        try
        {
            var response = await _auth.RegisterAsync(txtUsername.Text, txtEmail.Text, txtPassword.Text);

            if (response.Success)
            {
                MessageBox.Show("Registration successful! You can now login with your credentials.", 
                    "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                this.Close();
            }
            else
            {
                MessageBox.Show("Registration failed: " + response.Message, 
                    "Registration Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show("Connection error: " + ex.Message, 
                "Connection Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnRegister.Enabled = true;
        }
    }
}

// Main application form placeholder
public partial class MainForm : Form
{
    public MainForm()
    {
        this.Text = "Main Application";
        this.WindowState = FormWindowState.Maximized;
        
        Label lblWelcome = new Label()
        {
            Text = $"Welcome to the application, {Properties.Settings.Default.Username}!",
            Location = new System.Drawing.Point(50, 50),
            Size = new System.Drawing.Size(400, 30),
            Font = new System.Drawing.Font("Arial", 12, System.Drawing.FontStyle.Bold)
        };
        this.Controls.Add(lblWelcome);
    }
}