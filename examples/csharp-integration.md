# C# WinForms AuthAPI Integration Guide

यह guide आपको बताती है कि कैसे आप अपने C# WinForms application को AuthAPI service के साथ Visual Studio में connect करें।

## Prerequisites

1. Visual Studio (2019 या बाद का version)
2. .NET Framework 4.7.2 या .NET Core 3.1+
3. Newtonsoft.Json NuGet package

## Step 1: Required NuGet Packages Install करें

Visual Studio के Package Manager Console में ये commands run करें:

```
Install-Package Newtonsoft.Json
```

## Step 2: आपके API का URL और API Key

**आपकी API का URL:** `https://24dff18d-18d0-4b5a-b988-058e9bf61703-00-3eqcnf9gyu1ms.picard.replit.dev/api`

**Test API Key:** `test-api-key-123`

## Step 3: AuthService Class बनाएं

अपने project में एक नई class file बनाएं `AuthService.cs`:

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;

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
```

## Step 4: Login Form बनाएं

अपने login form में ये controls add करें:

1. **txtUsername** - TextBox (Username के लिए)
2. **txtPassword** - TextBox (Password के लिए, PasswordChar = '*' set करें)
3. **btnLogin** - Button (Login के लिए)
4. **btnRegister** - Button (Registration के लिए, optional)

## Step 5: Login Button का Code

Login button के click event में ये code add करें:

```csharp
private async void btnLogin_Click(object sender, EventArgs e)
{
    // Validation
    if (string.IsNullOrEmpty(txtUsername.Text))
    {
        MessageBox.Show("Username enter करें!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        return;
    }

    if (string.IsNullOrEmpty(txtPassword.Text))
    {
        MessageBox.Show("Password enter करें!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        return;
    }

    // Disable button during login
    btnLogin.Enabled = false;
    btnLogin.Text = "Logging in...";

    try
    {
        var authService = new AuthService();
        var result = await authService.LoginUser(txtUsername.Text, txtPassword.Text);
        
        if (result.Success)
        {
            MessageBox.Show("Login successful!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            
            // Session token save करें (optional)
            Properties.Settings.Default.SessionToken = result.SessionToken;
            Properties.Settings.Default.UserId = result.UserId;
            Properties.Settings.Default.Save();
            
            // Next form खोलें
            this.Hide();
            var dashboardForm = new DashboardForm(); // आपका next form
            dashboardForm.Show();
        }
        else
        {
            MessageBox.Show($"Login failed: {result.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
    catch (Exception ex)
    {
        MessageBox.Show($"Error occurred: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
    finally
    {
        // Button को वापस enable करें
        btnLogin.Enabled = true;
        btnLogin.Text = "Login";
    }
}
```

## Step 6: Registration Form (Optional)

अगर आप registration भी provide करना चाहते हैं:

```csharp
private async void btnRegister_Click(object sender, EventArgs e)
{
    // Validation
    if (string.IsNullOrEmpty(txtUsername.Text) || 
        string.IsNullOrEmpty(txtPassword.Text) || 
        string.IsNullOrEmpty(txtEmail.Text))
    {
        MessageBox.Show("सभी fields भरें!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        return;
    }

    btnRegister.Enabled = false;
    btnRegister.Text = "Registering...";

    try
    {
        var authService = new AuthService();
        var result = await authService.RegisterUser(txtUsername.Text, txtPassword.Text, txtEmail.Text);
        
        if (result.Success)
        {
            MessageBox.Show($"User registered successfully!\nUser ID: {result.UserId}", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            
            // Clear form
            txtUsername.Clear();
            txtPassword.Clear();
            txtEmail.Clear();
        }
        else
        {
            MessageBox.Show($"Registration failed: {result.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
    catch (Exception ex)
    {
        MessageBox.Show($"Error occurred: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
    finally
    {
        btnRegister.Enabled = true;
        btnRegister.Text = "Register";
    }
}
```

## Testing

1. पहले website पर जाकर `/register` page से एक test user बनाएं
2. फिर अपने WinForms app में उस username और password से login try करें

## Important Notes

1. **API Key**: हमेशा `test-api-key-123` use करें testing के लिए
2. **URL**: Production में URL change करना होगा
3. **Error Handling**: हमेशा try-catch use करें network calls के लिए
4. **Security**: Production app में API key को secure तरीके से store करें

## Common Issues और Solutions

### Issue 1: "Network Error" मिल रही है
**Solution**: 
- Internet connection check करें
- API URL सही है या नहीं verify करें
- Firewall settings check करें

### Issue 2: "Invalid API Key" error
**Solution**: 
- API_KEY constant में `test-api-key-123` use करें
- Spelling mistakes check करें

### Issue 3: "Invalid credentials" error
**Solution**: 
- पहले website पर user register करें
- Username/password spelling check करें
- Case sensitivity check करें

