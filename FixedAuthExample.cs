using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Management;
using System.Security.Cryptography;
using System.Linq;
using System.Drawing;

// FIXED AuthResponse Class - This fixes your "nullable value" error
public class AuthResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; }

    [JsonPropertyName("user_id")]
    public int UserId { get; set; }  // FIXED: Changed from int? to int (no more nullable!)

    [JsonPropertyName("username")]
    public string Username { get; set; }

    [JsonPropertyName("email")]
    public string Email { get; set; }

    [JsonPropertyName("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [JsonPropertyName("hwid_locked")]
    public bool? HwidLocked { get; set; }
}

// Session tracking response
public class SessionResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; }

    [JsonPropertyName("session_token")]
    public string SessionToken { get; set; }
}

// FIXED AuthApiClient with proper session management
public class AuthApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _baseUrl;

    public AuthApiClient(string apiKey, string baseUrl = "YOUR_API_BASE_URL")
    {
        _httpClient = new HttpClient();
        _apiKey = apiKey;
        _baseUrl = baseUrl;
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
    }

    public async Task<AuthResponse> LoginAsync(string username, string password, string version = null, string hwid = null)
    {
        var loginData = new { username, password, version, hwid };
        var json = JsonSerializer.Serialize(loginData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/login", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<AuthResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<AuthResponse> VerifyAsync(int userId)  // FIXED: No more nullable parameter
    {
        var verifyData = new { user_id = userId };
        var json = JsonSerializer.Serialize(verifyData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/verify", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<AuthResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<SessionResponse> StartSessionAsync(int userId, string sessionToken)
    {
        var sessionData = new { user_id = userId, session_token = sessionToken, action = "start" };
        var json = JsonSerializer.Serialize(sessionData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/session/track", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<SessionResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<SessionResponse> SendHeartbeatAsync(string sessionToken)
    {
        var sessionData = new { session_token = sessionToken, action = "heartbeat" };
        var json = JsonSerializer.Serialize(sessionData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/session/track", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<SessionResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<SessionResponse> EndSessionAsync(string sessionToken)
    {
        var sessionData = new { session_token = sessionToken, action = "end" };
        var json = JsonSerializer.Serialize(sessionData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/session/track", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<SessionResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
}

// FIXED Login Form with proper session monitoring
public partial class LoginForm : Form
{
    private AuthApiClient _authClient;
    private TextBox txtUsername;
    private TextBox txtPassword;
    private Button btnLogin;
    private Label lblStatus;

    // Session monitoring variables
    private System.Windows.Forms.Timer sessionTimer;
    private System.Windows.Forms.Timer heartbeatTimer;
    private int currentUserId;
    private string currentSessionToken;
    private int sessionCheckFailures = 0;
    private readonly int maxFailures = 3;

    public LoginForm()
    {
        InitializeComponent();
        _authClient = new AuthApiClient("YOUR_API_KEY", "YOUR_BASE_URL");
    }

    private void InitializeComponent()
    {
        this.Text = "Application Login";
        this.Size = new System.Drawing.Size(400, 300);
        this.StartPosition = FormStartPosition.CenterScreen;

        var lblUsername = new Label { Text = "Username:", Location = new System.Drawing.Point(50, 50), Size = new System.Drawing.Size(80, 23) };
        txtUsername = new TextBox { Location = new System.Drawing.Point(140, 50), Size = new System.Drawing.Size(200, 23) };

        var lblPassword = new Label { Text = "Password:", Location = new System.Drawing.Point(50, 90), Size = new System.Drawing.Size(80, 23) };
        txtPassword = new TextBox { Location = new System.Drawing.Point(140, 90), Size = new System.Drawing.Size(200, 23), UseSystemPasswordChar = true };

        btnLogin = new Button { Text = "Login", Location = new System.Drawing.Point(140, 130), Size = new System.Drawing.Size(100, 30) };
        btnLogin.Click += async (s, e) => await LoginAsync();

        lblStatus = new Label { Location = new System.Drawing.Point(50, 180), Size = new System.Drawing.Size(300, 60), ForeColor = System.Drawing.Color.Red };

        this.Controls.AddRange(new Control[] { lblUsername, txtUsername, lblPassword, txtPassword, btnLogin, lblStatus });
    }

    private async Task LoginAsync()
    {
        try
        {
            btnLogin.Enabled = false;
            lblStatus.Text = "Authenticating...";
            lblStatus.ForeColor = System.Drawing.Color.Blue;

            string hwid = GetHardwareId();

            var loginResult = await _authClient.LoginAsync(txtUsername.Text, txtPassword.Text, "1.0.0", hwid);

            if (loginResult.Success)
            {
                string expiryInfo = "";
                if (loginResult.ExpiresAt.HasValue)
                {
                    expiryInfo = $"\nAccount expires: {loginResult.ExpiresAt.Value:yyyy-MM-dd HH:mm:ss}";
                }

                lblStatus.Text = loginResult.Message + expiryInfo;
                lblStatus.ForeColor = System.Drawing.Color.Green;

                MessageBox.Show(loginResult.Message, "Login Successful", MessageBoxButtons.OK, MessageBoxIcon.Information);

                // FIXED: No more .Value needed since UserId is now int, not int?
                var verifyResult = await _authClient.VerifyAsync(loginResult.UserId);
                if (verifyResult.Success)
                {
                    Console.WriteLine("User session verified successfully!");

                    this.Hide();

                    var mainForm = new MainForm();
                    mainForm.UserData = new UserInfo
                    {
                        UserId = loginResult.UserId,  // FIXED: No .Value needed
                        Username = loginResult.Username,
                        Email = loginResult.Email,
                        ExpiresAt = loginResult.ExpiresAt
                    };
                    Program.CurrentUserId = loginResult.UserId;
                    mainForm.Show();

                    // Start enhanced session monitoring
                    StartSessionMonitoring(loginResult.UserId);  // FIXED: No .Value needed
                }
                else
                {
                    MessageBox.Show("Session verification failed. Please try logging in again.",
                                  "Security Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);

                    txtUsername.Clear();
                    txtPassword.Clear();
                    txtUsername.Focus();
                }
            }
            else
            {
                lblStatus.Text = loginResult.Message;
                lblStatus.ForeColor = System.Drawing.Color.Red;

                MessageBox.Show(loginResult.Message, "Login Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);

                HandleLoginError(loginResult.Message);
            }
        }
        catch (Exception ex)
        {
            lblStatus.Text = $"Connection error: {ex.Message}";
            lblStatus.ForeColor = System.Drawing.Color.Red;
            MessageBox.Show($"Network error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnLogin.Enabled = true;
        }
    }

    private void HandleLoginError(string errorMessage)
    {
        if (errorMessage.ToLower().Contains("disabled"))
        {
            MessageBox.Show("Your account has been disabled. Please contact support.",
                          "Account Disabled", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            Application.Exit();
        }
        else if (errorMessage.ToLower().Contains("expired"))
        {
            MessageBox.Show("Your subscription has expired. Please renew to continue.",
                          "Subscription Expired", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        else if (errorMessage.ToLower().Contains("version"))
        {
            MessageBox.Show("Your application version is outdated. Please download the latest version.",
                          "Version Mismatch", MessageBoxButtons.OK, MessageBoxIcon.Information);
            Application.Exit();
        }
        else if (errorMessage.ToLower().Contains("hwid") || errorMessage.ToLower().Contains("hardware"))
        {
            MessageBox.Show("Hardware ID mismatch detected. Please contact support.",
                          "Device Mismatch", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private void StartSessionMonitoring(int userId)
    {
        currentUserId = userId;
        sessionCheckFailures = 0;
        currentSessionToken = GenerateSessionToken();

        // Start session tracking on server
        Task.Run(async () => {
            try
            {
                var sessionResult = await _authClient.StartSessionAsync(userId, currentSessionToken);
                if (sessionResult.Success)
                {
                    Console.WriteLine($"Session started: {currentSessionToken.Substring(0, 8)}...");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to start session: {ex.Message}");
            }
        });

        // Session verification every 5 minutes
        sessionTimer = new System.Windows.Forms.Timer();
        sessionTimer.Interval = 300000; // 5 minutes
        sessionTimer.Tick += async (s, e) => await VerifySessionPeriodically();
        sessionTimer.Start();

        // Heartbeat every 30 seconds
        heartbeatTimer = new System.Windows.Forms.Timer();
        heartbeatTimer.Interval = 30000; // 30 seconds
        heartbeatTimer.Tick += async (s, e) => await SendHeartbeat();
        heartbeatTimer.Start();

        Console.WriteLine("Session monitoring started successfully");
    }

    private string GenerateSessionToken()
    {
        var guid = Guid.NewGuid().ToString("N");
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return $"sess_{guid}_{timestamp}";
    }

    private async Task VerifySessionPeriodically()
    {
        try
        {
            var verifyResult = await _authClient.VerifyAsync(currentUserId);
            if (!verifyResult.Success)
            {
                sessionCheckFailures++;
                Console.WriteLine($"Session verification failed ({sessionCheckFailures}/{maxFailures})");

                if (sessionCheckFailures >= maxFailures)
                {
                    await ForceLogout("Your session has expired. Please login again.");
                }
            }
            else
            {
                sessionCheckFailures = 0;
                Console.WriteLine($"Session verified at {DateTime.Now:HH:mm:ss}");

                if (verifyResult.Message.Contains("disabled") || verifyResult.Message.Contains("expired"))
                {
                    await ForceLogout(verifyResult.Message);
                }
            }
        }
        catch (HttpRequestException httpEx)
        {
            sessionCheckFailures++;
            if (sessionCheckFailures >= maxFailures)
            {
                await ForceLogout("Network connection lost. Please login again.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Session verification error: {ex.Message}");
        }
    }

    private async Task SendHeartbeat()
    {
        try
        {
            if (!string.IsNullOrEmpty(currentSessionToken))
            {
                var heartbeatResult = await _authClient.SendHeartbeatAsync(currentSessionToken);
                if (!heartbeatResult.Success)
                {
                    Console.WriteLine($"Heartbeat failed: {heartbeatResult.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Heartbeat error: {ex.Message}");
        }
    }

    private async Task ForceLogout(string reason)
    {
        // End session on server
        if (!string.IsNullOrEmpty(currentSessionToken))
        {
            try
            {
                await _authClient.EndSessionAsync(currentSessionToken);
                Console.WriteLine("Session ended on server");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to end session: {ex.Message}");
            }
        }

        // Stop timers
        sessionTimer?.Stop();
        sessionTimer?.Dispose();
        heartbeatTimer?.Stop();
        heartbeatTimer?.Dispose();

        // Show message and return to login
        MessageBox.Show(reason, "Session Expired", MessageBoxButtons.OK, MessageBoxIcon.Warning);

        if (this.InvokeRequired)
        {
            this.Invoke(new Action(() => {
                CloseMainFormsAndShowLogin();
            }));
        }
        else
        {
            CloseMainFormsAndShowLogin();
        }
    }

    private void CloseMainFormsAndShowLogin()
    {
        foreach (Form form in Application.OpenForms.Cast<Form>().ToArray())
        {
            if (form.Name == "MainForm" || form.GetType().Name == "MainForm")
            {
                form.Hide();
                form.Close();
            }
        }

        this.Show();
        this.WindowState = FormWindowState.Normal;
        this.BringToFront();
        txtUsername.Clear();
        txtPassword.Clear();
        txtUsername.Focus();

        // Clear session data
        currentSessionToken = null;
        currentUserId = 0;
        sessionCheckFailures = 0;
    }

    public void StopSessionMonitoring()
    {
        sessionTimer?.Stop();
        sessionTimer?.Dispose();
        heartbeatTimer?.Stop();
        heartbeatTimer?.Dispose();
        Console.WriteLine("Session monitoring stopped");
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        StopSessionMonitoring();
        base.OnFormClosing(e);
    }

    private string GetHardwareId()
    {
        try
        {
            var mc = new ManagementClass("win32_processor");
            var moc = mc.GetInstances();
            string cpuId = "";
            foreach (ManagementObject mo in moc)
            {
                cpuId = mo.Properties["processorID"].Value.ToString();
                break;
            }

            var drive = new ManagementObject(@"win32_logicaldisk.deviceid=""C:""");
            drive.Get();
            string volumeSerial = drive["VolumeSerialNumber"].ToString();

            string combined = cpuId + volumeSerial;
            using (var sha256 = SHA256.Create())
            {
                byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));
                return Convert.ToBase64String(hash);
            }
        }
        catch
        {
            return Environment.MachineName + Environment.UserName;
        }
    }
}

// User information class
public class UserInfo
{
    public int UserId { get; set; }  // FIXED: No longer nullable
    public string Username { get; set; }
    public string Email { get; set; }
    public DateTime LoginTime { get; set; } = DateTime.Now;
    public DateTime? ExpiresAt { get; set; }
}

// Sample MainForm class
public class MainForm : Form
{
    public UserInfo UserData { get; set; }

    public MainForm()
    {
        InitializeComponent();
        this.Text = "Main Application - Authenticated";
        this.Size = new System.Drawing.Size(600, 400);
        this.StartPosition = FormStartPosition.CenterScreen;

        var lblWelcome = new Label
        {
            Text = "Welcome! You are authenticated.",
            Location = new System.Drawing.Point(50, 50),
            Size = new System.Drawing.Size(400, 23),
            Font = new System.Drawing.Font("Arial", 12, System.Drawing.FontStyle.Bold)
        };

        var lblExpiry = new Label
        {
            Text = "Loading account information...",
            Location = new System.Drawing.Point(50, 80),
            Size = new System.Drawing.Size(500, 23),
            ForeColor = Color.DarkBlue
        };

        this.Controls.Add(lblWelcome);
        this.Controls.Add(lblExpiry);

        // Load and display user expiry information
        LoadUserExpiryInfo(lblExpiry);
    }

    private async void LoadUserExpiryInfo(Label lblExpiry)
    {
        try
        {
            // Get user info from verify endpoint which includes expiry
            var authClient = new AuthApiClient("YOUR_API_KEY", "YOUR_BASE_URL");
            var verifyResponse = await authClient.VerifyAsync(Program.CurrentUserId);

            if (verifyResponse.Success && UserData.ExpiresAt.HasValue)
            {
                var daysLeft = (UserData.ExpiresAt.Value - DateTime.Now).Days;
                if (daysLeft > 0)
                {
                    lblExpiry.Text = $"Account expires: {UserData.ExpiresAt.Value:yyyy-MM-dd} ({daysLeft} days left)";
                    lblExpiry.ForeColor = daysLeft > 7 ? Color.Green : Color.Orange;
                }
                else
                {
                    lblExpiry.Text = "Account has expired!";
                    lblExpiry.ForeColor = Color.Red;
                }
            }
            else
            {
                lblExpiry.Text = "No expiry date set (Lifetime access)";
                lblExpiry.ForeColor = Color.Green;
            }
        }
        catch (Exception ex)
        {
            lblExpiry.Text = $"Error loading expiry info: {ex.Message}";
            lblExpiry.ForeColor = Color.Red;
        }
    }
}

// Program entry point
class Program
{
    public static int CurrentUserId { get; set; }

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new LoginForm());
    }
}