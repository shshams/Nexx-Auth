export interface AuthResponse {
  success: boolean;
  message: string;
  user_id?: string;
  session_token?: string;
}

export class AuthService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = '/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        api_key: this.apiKey,
      }),
    });

    return response.json();
  }

  async register(username: string, password: string, email: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        email,
        api_key: this.apiKey,
      }),
    });

    return response.json();
  }

  async verify(sessionToken: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
        api_key: this.apiKey,
      }),
    });

    return response.json();
  }

  async logout(sessionToken: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
        api_key: this.apiKey,
      }),
    });

    return response.json();
  }
}
