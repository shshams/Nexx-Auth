using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Management;
using System.Security.Cryptography;
using System.Windows.Forms;
using Newtonsoft.Json;

public class PrimeAuth
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly string _appVersion;

    public PrimeAuth(string apiKey, string appVersion = "1.0.0", string baseUrl = "https://your-replit-url.replit.dev/api/v1")
    {
        _apiKey = apiKey;
        _baseUrl = baseUrl;
        _appVersion = appVersion;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
    }

    public static string GetHardwareId()
    {
        try
        {
            string hwid = "";

            ManagementObjectSearcher mos = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
            foreach (ManagementObject mo in mos.Get())
            {
                hwid += mo["ProcessorId"].ToString();
            }

            mos = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard");
            foreach (ManagementObject mo in mos.Get())
            {
                hwid += mo["SerialNumber"].ToString();
            }

            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(hwid));
                return Convert.ToBase64String(hash).Substring(0, 32);
            }
        }
        catch
        {
            return "HWID-FALLBACK-" + Environment.MachineName;
        }
    }

    public async Task<AuthResponse> LoginAsync(string username, string password, bool includeHwid = true)
    {
        var data = new
        {
            username,
            password,
            api_key = _apiKey,
            version = _appVersion,
            hwid = includeHwid ? GetHardwareId() : null
        };

        var json = JsonConvert.SerializeObject(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/login", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonConvert.DeserializeObject<AuthResponse>(responseJson);
    }

    public async Task<AuthResponse> RegisterAsync(string username, string email, string password, DateTime? expiresAt = null)
    {
        var data = new
        {
            username,
            email,
            password,
            expiresAt,
            hwid = GetHardwareId()
        };

        var json = JsonConvert.SerializeObject(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/register", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonConvert.DeserializeObject<AuthResponse>(responseJson);
    }

    public async Task<AuthResponse> VerifySessionAsync(int userId)
    {
        var data = new { user_id = userId };
        var json = JsonConvert.SerializeObject(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/verify", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        return JsonConvert.DeserializeObject<AuthResponse>(responseJson);
    }

    /// <summary>
    /// Handles login errors with appropriate user interface responses and actions
    /// </summary>
    /// <param name="message">The error message from the authentication response</param>
    public void HandleLoginError(string message)
    {
        string errorTitle = "Login Failed";
        MessageBoxIcon icon = MessageBoxIcon.Error;

        if (message.Contains("version") || message.Contains("update"))
        {
            errorTitle = "Update Required";
            icon = MessageBoxIcon.Warning;
            DialogResult result = MessageBox.Show(
                message + "\n\nWould you like to download the latest version?",
                errorTitle, MessageBoxButtons.YesNo, icon);

            if (result == DialogResult.Yes)
            {
                System.Diagnostics.Process.Start("https://youtube.com/officialowner1");
            }
            Application.Exit();
        }
        else if (message.Contains("hardware") || message.Contains("HWID"))
        {
            errorTitle = "Hardware Mismatch";
            icon = MessageBoxIcon.Warning;
            MessageBox.Show("This account is locked to a different computer!", errorTitle, MessageBoxButtons.OK, icon);
        }
        else if (message.Contains("expired"))
        {
            errorTitle = "Account Expired";
            icon = MessageBoxIcon.Warning;
        }
        else if (message.Contains("disabled") || message.Contains("paused"))
        {
            errorTitle = "Account Disabled";
            icon = MessageBoxIcon.Warning;
        }
        else if (message.Contains("blacklisted") || message.Contains("blocked"))
        {
            errorTitle = "Access Blocked";
            icon = MessageBoxIcon.Stop;
            MessageBox.Show("Access denied. Contact support if you believe this is an error.", errorTitle, MessageBoxButtons.OK, icon);
            Application.Exit();
        }

        MessageBox.Show(message, errorTitle, MessageBoxButtons.OK, icon);
    }

    /// <summary>
    /// Simplified login method with automatic error handling
    /// </summary>
    /// <param name="username">Username for login</param>
    /// <param name="password">Password for login</param>
    /// <param name="includeHwid">Whether to include hardware ID</param>
    /// <param name="handleErrors">Whether to automatically handle errors with UI dialogs</param>
    /// <returns>AuthResponse object</returns>
    public async Task<AuthResponse> LoginWithErrorHandlingAsync(string username, string password, bool includeHwid = true, bool handleErrors = true)
    {
        var response = await LoginAsync(username, password, includeHwid);
        
        if (!response.Success && handleErrors)
        {
            HandleLoginError(response.Message);
        }
        
        return response;
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

public class AuthResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string Message { get; set; }

    [JsonProperty("user_id")]
    public int? UserId { get; set; }

    [JsonProperty("username")]
    public string Username { get; set; }

    [JsonProperty("email")]
    public string Email { get; set; }

    [JsonProperty("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [JsonProperty("hwid_locked")]
    public bool? HwidLocked { get; set; }

    [JsonProperty("required_version")]
    public string RequiredVersion { get; set; }

    [JsonProperty("current_version")]
    public string CurrentVersion { get; set; }
}